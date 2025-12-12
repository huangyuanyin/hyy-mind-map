import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { NodeManager } from '../core/NodeManager';
import type { Point, Rect, ViewState, DragPreviewState, DropPosition } from '../types';
import type { EventType, EventData, EventHandler, EventListeners } from '../types/events';
import { DRAG, MOUSE_BUTTON, ZOOM } from '../constants';

/**
 * EventSystem - 事件系统
 */
export class EventSystem {
  private canvas: HTMLCanvasElement;
  private nodeManager: NodeManager;
  private listeners: EventListeners = new Map();

  // 事件处理器引用（用于正确解绑）
  private readonly boundHandlers: {
    mousedown: (e: MouseEvent) => void;
    mousemove: (e: MouseEvent) => void;
    mouseup: (e: MouseEvent) => void;
    dblclick: (e: MouseEvent) => void;
    wheel: (e: WheelEvent) => void;
    contextmenu: (e: MouseEvent) => void;
  };

  // 拖拽状态
  private dragState = {
    isDraggingNode: false,
    isDraggingCanvas: false,
    allowNodeDrag: false,
  };

  private activeNode: HyyMindMapNode | null = null;
  private hoverNode: HyyMindMapNode | null = null;
  private dragStart: Point = { x: 0, y: 0 };
  private lastMousePos: Point = { x: 0, y: 0 };

  // 拖拽预览状态
  private dragPreview: DragPreviewState = {
    isDragging: false,
    dragNode: null,
    ghostPosition: null,
    dropTarget: null,
    dropPosition: null,
  };

  // 框选状态
  private selectionState = {
    isSelecting: false,
    start: null as Point | null,
    end: null as Point | null,
  };

  // 最后选中的节点（用于范围选择）
  private lastSelectedNode: HyyMindMapNode | null = null;

  // 变换状态（用于坐标转换）
  private viewState: ViewState = {
    scale: 1,
    translateX: 0,
    translateY: 0,
  };

  constructor(canvas: HTMLCanvasElement, nodeManager: NodeManager) {
    this.canvas = canvas;
    this.nodeManager = nodeManager;

    // 预先绑定处理器，确保可以正确解绑
    this.boundHandlers = {
      mousedown: this.onMouseDown.bind(this),
      mousemove: this.onMouseMove.bind(this),
      mouseup: this.onMouseUp.bind(this),
      dblclick: this.onDoubleClick.bind(this),
      wheel: this.onWheel.bind(this),
      contextmenu: this.onContextMenu.bind(this),
    };

    this.bindEvents();
  }

  /**
   * 设置视图状态
   */
  public setViewState(scale: number, translateX: number, translateY: number): void {
    this.viewState = { scale, translateX, translateY };
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
    document.addEventListener('mousemove', this.boundHandlers.mousemove);
    document.addEventListener('mouseup', this.boundHandlers.mouseup);
    this.canvas.addEventListener('dblclick', this.boundHandlers.dblclick);
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
  }

  /**
   * 解绑事件
   */
  public unbindEvents(): void {
    this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
    document.removeEventListener('mousemove', this.boundHandlers.mousemove);
    document.removeEventListener('mouseup', this.boundHandlers.mouseup);
    this.canvas.removeEventListener('dblclick', this.boundHandlers.dblclick);
    this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
  }

  /**
   * 屏幕坐标 -> Canvas坐标
   */
  private getCanvasCoordinates(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  /**
   * Canvas坐标 -> 世界坐标
   */
  private getWorldCoordinates(canvasX: number, canvasY: number): Point {
    const { scale, translateX, translateY } = this.viewState;
    return {
      x: (canvasX - translateX) / scale,
      y: (canvasY - translateY) / scale,
    };
  }

  /**
   * 查找点击的节点（包括节点本身和指示器区域）
   */
  private findNodeAt(x: number, y: number): HyyMindMapNode | null {
    const nodes = this.nodeManager.getAllNodes();

    // 从后往前遍历（后绘制的在上层）
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];

      // 先检查是否点击了指示器区域（只有指示器可见时才检查）
      if (node.children.length > 0 && (node.isActive || node.isSelected)) {
        if (node.containsExpandIndicator(x, y)) {
          return node;
        }
      }

      // 再检查是否点击了节点本身
      if (node.contains(x, y)) {
        return node;
      }
    }

    return null;
  }

  /**
   * 检查是否按下了修饰键
   */
  private hasModifierKey(e: MouseEvent): boolean {
    return e.metaKey || e.ctrlKey || e.shiftKey;
  }

  /**
   * 处理展开/收起指示器点击
   */
  private handleIndicatorClick(node: HyyMindMapNode, world: Point): boolean {
    const clickedSide = node.getClickedIndicatorSide(world.x, world.y);
    if (!clickedSide) return false;

    if (node.hasChildrenOnBothSides()) {
      if (clickedSide === 'left') {
        node.expandedLeft = !node.expandedLeft;
      } else {
        node.expandedRight = !node.expandedRight;
      }
    } else {
      node.expanded = !node.expanded;
    }

    this.emit('render_needed');
    return true;
  }

  /**
   * 处理多选点击（Cmd/Ctrl + 点击）
   */
  private handleMultiSelectClick(node: HyyMindMapNode): void {
    node.isSelected = !node.isSelected;
    if (node.isSelected) {
      this.lastSelectedNode = node;
    }
    this.emit('selection_changed', { nodes: this.getSelectedNodes() });
    this.emit('render_needed');
  }

  /**
   * 处理范围选择（Shift + 点击）
   */
  private handleRangeSelectClick(node: HyyMindMapNode): void {
    if (this.lastSelectedNode) {
      this.selectRange(this.lastSelectedNode, node);
    }
    this.emit('selection_changed', { nodes: this.getSelectedNodes() });
    this.emit('render_needed');
  }

  /**
   * 处理右键点击节点
   */
  private handleRightClickNode(node: HyyMindMapNode, world: Point, e: MouseEvent): void {
    this.dragState.allowNodeDrag = false;

    // 清除所有节点的选中状态
    for (const n of this.nodeManager.getAllNodes()) {
      n.isActive = false;
      n.isSelected = false;
    }

    // 选中当前节点
    node.isActive = true;
    this.activeNode = node;
    this.lastSelectedNode = node;

    this.emit('selection_changed', { nodes: [] });
    this.emit('node_mousedown', { node, x: world.x, y: world.y, event: e });
    this.emit('render_needed');
  }

  /**
   * 处理左键点击节点
   */
  private handleLeftClickNode(node: HyyMindMapNode, world: Point, e: MouseEvent): void {
    // 如果点击的是未选中的节点，清除框选
    if (!node.isSelected) {
      this.clearSelection();
    }

    this.activeNode = node;
    this.lastSelectedNode = node;
    this.dragState.allowNodeDrag = true;
    this.dragState.isDraggingNode = false;
    this.emit('node_mousedown', { node, x: world.x, y: world.y, event: e });
  }

  /**
   * 开始框选模式
   */
  private startSelectionMode(world: Point): void {
    this.selectionState.isSelecting = true;
    this.selectionState.start = world;
    this.selectionState.end = world;
  }

  /**
   * 准备画布拖拽
   */
  private prepareCanvasDrag(canvas: Point, world: Point, e: MouseEvent): void {
    this.clearSelection();
    this.lastSelectedNode = null;
    this.dragState.isDraggingCanvas = false;
    this.dragStart = canvas;
    this.emit('canvas_mousedown', { x: world.x, y: world.y, event: e });
  }

  /**
   * 鼠标按下
   */
  private onMouseDown(e: MouseEvent): void {
    const canvas = this.getCanvasCoordinates(e);
    const world = this.getWorldCoordinates(canvas.x, canvas.y);
    this.lastMousePos = canvas;

    const node = this.findNodeAt(world.x, world.y);

    if (node) {
      // 检查是否点击了展开/收起指示器
      if (this.handleIndicatorClick(node, world)) return;

      // Cmd/Ctrl + 点击 - 多选模式
      if (e.metaKey || e.ctrlKey) {
        this.handleMultiSelectClick(node);
        return;
      }

      // Shift + 点击 - 范围选择
      if (e.shiftKey && this.lastSelectedNode) {
        this.handleRangeSelectClick(node);
        return;
      }

      // 右键点击
      if (e.button === MOUSE_BUTTON.RIGHT) {
        this.handleRightClickNode(node, world, e);
        return;
      }

      // 左键点击
      this.handleLeftClickNode(node, world, e);
    } else {
      // 点击了空白

      // 修饰键 + 空白拖动 - 启动框选模式
      if (this.hasModifierKey(e)) {
        this.startSelectionMode(world);
        return;
      }

      // 普通点击空白 - 清除框选并准备拖拽画布
      this.prepareCanvasDrag(canvas, world, e);
    }
  }

  /**
   * 处理节点拖拽
   */
  private handleNodeDrag(world: Point, deltaX: number, deltaY: number): void {
    if (!this.activeNode) return;

    // 判断是否为根节点
    if (this.activeNode.parent === null) {
      // 拖拽根节点 -> 移动所有节点
      const deltaWorldX = deltaX / this.viewState.scale;
      const deltaWorldY = deltaY / this.viewState.scale;

      for (const node of this.nodeManager.getAllNodes()) {
        node.x += deltaWorldX;
        node.y += deltaWorldY;
      }
      this.emit('node_drag', { node: this.activeNode, x: world.x, y: world.y });
    } else {
      // 拖拽普通节点 - 使用新的拖拽预览系统
      this.updateDragPreview(world);
    }

    this.emit('render_needed');
  }

  /**
   * 更新拖拽预览状态
   */
  private updateDragPreview(world: Point): void {
    if (!this.activeNode) return;

    // 设置拖拽状态
    this.dragPreview.isDragging = true;
    this.dragPreview.dragNode = this.activeNode;
    this.dragPreview.ghostPosition = { ...world };

    // 检测放置目标
    const { target, position } = this.findDropTarget(world);
    this.dragPreview.dropTarget = target;
    this.dragPreview.dropPosition = position;

    // 发射拖拽预览变化事件
    this.emit('drag_preview_change', { dragPreview: { ...this.dragPreview } });
  }

  /**
   * 查找放置目标节点
   */
  private findDropTarget(world: Point): { target: HyyMindMapNode | null; position: DropPosition | null } {
    const nodes = this.nodeManager.getAllNodes();
    const dragNode = this.activeNode;

    if (!dragNode) return { target: null, position: null };

    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];

      // 跳过被拖拽的节点及其子节点
      if (this.isNodeOrDescendant(node, dragNode)) continue;

      // 检查是否在节点区域内
      if (this.isPointNearNode(world, node)) {
        const position = this.determineDropPosition(world, node);
        return { target: node, position };
      }
    }

    return { target: null, position: null };
  }

  /**
   * 判断节点是否是目标节点或其后代
   */
  private isNodeOrDescendant(node: HyyMindMapNode, target: HyyMindMapNode): boolean {
    if (node === target) return true;
    let current: HyyMindMapNode | null = node;
    while (current) {
      if (current === target) return true;
      current = current.parent;
    }
    return false;
  }

  /**
   * 判断点是否在节点附近
   */
  private isPointNearNode(point: Point, node: HyyMindMapNode): boolean {
    const margin = 20; // 扩展检测区域
    return (
      point.x >= node.x - margin &&
      point.x <= node.x + node.width + margin &&
      point.y >= node.y - margin &&
      point.y <= node.y + node.height + margin
    );
  }

  /**
   * 确定放置位置
   */
  private determineDropPosition(point: Point, targetNode: HyyMindMapNode): DropPosition {
    // 根节点只支持 inside
    if (targetNode.parent === null) {
      return 'inside';
    }

    const nodeTop = targetNode.y;
    const nodeBottom = targetNode.y + targetNode.height;

    // 根据鼠标在节点的垂直位置判断放置位置
    if (point.y < nodeTop + targetNode.height * 0.3) {
      return 'before';
    } else if (point.y > nodeBottom - targetNode.height * 0.3) {
      return 'after';
    } else {
      return 'inside'; // 放置为子节点
    }
  }

  /**
   * 重置拖拽预览状态
   */
  private resetDragPreview(): void {
    this.dragPreview = {
      isDragging: false,
      dragNode: null,
      ghostPosition: null,
      dropTarget: null,
      dropPosition: null,
    };
    this.emit('drag_preview_change', { dragPreview: { ...this.dragPreview } });
  }

  /**
   * 获取拖拽预览状态
   */
  public getDragPreview(): DragPreviewState {
    return { ...this.dragPreview };
  }

  /**
   * 处理 hover 效果
   */
  private handleHover(world: Point): void {
    const node = this.findNodeAt(world.x, world.y);
    if (node !== this.hoverNode) {
      if (this.hoverNode) {
        this.hoverNode.isHover = false;
      }
      if (node) {
        node.isHover = true;
      }
      this.hoverNode = node;
      this.emit('render_needed');
    }
  }

  /**
   * 鼠标移动
   */
  private onMouseMove(e: MouseEvent): void {
    const canvas = this.getCanvasCoordinates(e);
    const world = this.getWorldCoordinates(canvas.x, canvas.y);

    // 计算移动距离
    const deltaX = canvas.x - this.lastMousePos.x;
    const deltaY = canvas.y - this.lastMousePos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 框选模式
    if (this.selectionState.isSelecting && this.selectionState.start) {
      this.selectionState.end = world;
      this.updateSelection();
      this.emit('render_needed');
      this.lastMousePos = canvas;
      return;
    }

    if (this.activeNode && this.dragState.allowNodeDrag) {
      // 如果移动距离超过阈值，开始拖拽
      if (!this.dragState.isDraggingNode && distance > DRAG.THRESHOLD) {
        this.dragState.isDraggingNode = true;
      }

      if (this.dragState.isDraggingNode) {
        this.handleNodeDrag(world, deltaX, deltaY);
      }
    } else if (this.dragStart.x !== 0 || this.dragStart.y !== 0) {
      // 如果移动距离超过阈值，开始拖拽画布
      if (!this.dragState.isDraggingCanvas && distance > DRAG.THRESHOLD) {
        this.dragState.isDraggingCanvas = true;
      }

      if (this.dragState.isDraggingCanvas) {
        this.emit('canvas_drag', { deltaX, deltaY });
        this.emit('render_needed');
      }
    } else {
      // 检测 hover
      this.handleHover(world);
    }

    this.lastMousePos = canvas;
  }

  /**
   * 鼠标抬起
   */
  private onMouseUp(e: MouseEvent): void {
    const canvas = this.getCanvasCoordinates(e);
    const world = this.getWorldCoordinates(canvas.x, canvas.y);

    // 结束框选
    if (this.selectionState.isSelecting) {
      this.selectionState.isSelecting = false;
      this.selectionState.start = null;
      this.selectionState.end = null;
      this.emit('render_needed');
      return;
    }

    if (this.activeNode) {
      // 只有没有拖拽时才触发点击
      if (!this.dragState.isDraggingNode) {
        this.emit('node_click', { node: this.activeNode, x: world.x, y: world.y, event: e });
      } else if (this.dragPreview.isDragging && this.dragPreview.dropTarget && this.dragPreview.dropPosition) {
        // 拖拽结束，发射放置事件
        this.emit('node_drop', {
          node: this.activeNode,
          dropTarget: this.dragPreview.dropTarget,
          dropPosition: this.dragPreview.dropPosition,
        });
      }
      this.emit('node_mouseup', { node: this.activeNode, x: world.x, y: world.y, event: e });
    } else if (!this.dragState.isDraggingCanvas) {
      // 点击了空白区域（没有拖拽画布时）
      this.emit('canvas_click', { x: world.x, y: world.y, event: e });
    }

    // 重置拖拽预览状态
    if (this.dragPreview.isDragging) {
      this.resetDragPreview();
    }

    // 重置状态
    this.resetDragState();
  }

  /**
   * 重置拖拽状态
   */
  private resetDragState(): void {
    this.dragState.isDraggingNode = false;
    this.dragState.isDraggingCanvas = false;
    this.dragState.allowNodeDrag = false;
    this.activeNode = null;
    this.dragStart = { x: 0, y: 0 };
  }

  /**
   * 双击
   */
  private onDoubleClick(e: MouseEvent): void {
    console.log('[EventSystem] onDoubleClick triggered', e);
    const canvas = this.getCanvasCoordinates(e);
    const world = this.getWorldCoordinates(canvas.x, canvas.y);
    const node = this.findNodeAt(world.x, world.y);

    console.log('[EventSystem] Found node:', node);
    if (node) {
      console.log('[EventSystem] Emitting node_dblclick event');
      this.emit('node_dblclick', { node, x: world.x, y: world.y, event: e });
    }
  }

  /**
   * 滚轮缩放
   */
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = -e.deltaY * ZOOM.WHEEL_FACTOR;
    const canvas = this.getCanvasCoordinates(e);
    this.emit('zoom', { delta, x: canvas.x, y: canvas.y });
  }

  /**
   * 右键菜单
   */
  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    // 重置拖拽状态，防止右键打断拖拽后状态异常
    this.dragState.isDraggingNode = false;
    this.dragState.isDraggingCanvas = false;
    this.dragState.allowNodeDrag = false;
    this.dragStart = { x: 0, y: 0 };
  }

  /**
   * 订阅事件
   */
  public on(event: EventType, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  /**
   * 取消订阅
   */
  public off(event: EventType, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 发布事件
   */
  public emit(event: EventType, data?: EventData): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data ?? {}));
    }
  }

  /**
   * 获取当前激活的节点
   */
  public getActiveNode(): HyyMindMapNode | null {
    return this.activeNode;
  }

  /**
   * 模拟节点的 mousedown 事件（供 DOM 节点调用）
   */
  public simulateNodeMouseDown(node: HyyMindMapNode, event: MouseEvent): void {
    // 使用实际鼠标事件的坐标
    const canvas = this.getCanvasCoordinates(event);
    const world = this.getWorldCoordinates(canvas.x, canvas.y);
    
    this.lastMousePos = canvas;

    // 右键点击 - 不设置 dragStart，避免右键菜单打开后画布跟随鼠标移动
    if (event.button === MOUSE_BUTTON.RIGHT) {
      this.handleRightClickNode(node, world, event);
      return;
    }

    // 左键点击才设置 dragStart
    this.dragStart = canvas;

    // Cmd/Ctrl + 点击 - 多选模式
    if (event.metaKey || event.ctrlKey) {
      this.handleMultiSelectClick(node);
      return;
    }

    // Shift + 点击 - 范围选择
    if (event.shiftKey && this.lastSelectedNode) {
      this.handleRangeSelectClick(node);
      return;
    }

    // 左键点击
    this.handleLeftClickNode(node, world, event);
  }

  /**
   * 获取所有选中的节点
   */
  public getSelectedNodes(): HyyMindMapNode[] {
    return this.nodeManager.getAllNodes().filter((node) => node.isSelected);
  }

  /**
   * 更新框选状态
   */
  private updateSelection(): void {
    const rect = this.getSelectionRect();
    if (!rect) return;

    const nodes = this.nodeManager.getAllNodes();
    const selectedNodes: HyyMindMapNode[] = [];

    for (const node of nodes) {
      const isIntersecting = this.isNodeInRect(node, rect);
      node.isSelected = isIntersecting;
      if (isIntersecting) {
        selectedNodes.push(node);
      }
    }

    this.emit('selection_changed', { nodes: selectedNodes });
  }

  /**
   * 判断节点是否与矩形相交
   */
  private isNodeInRect(node: HyyMindMapNode, rect: Rect): boolean {
    return !(
      node.x > rect.x + rect.width ||
      node.x + node.width < rect.x ||
      node.y > rect.y + rect.height ||
      node.y + node.height < rect.y
    );
  }

  /**
   * 获取框选矩形（标准化后的，左上角为起点）
   */
  public getSelectionRect(): Rect | null {
    const { start, end } = this.selectionState;
    if (!start || !end) return null;

    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  /**
   * 清除所有选中状态（包括单选和框选）
   */
  public clearSelection(): void {
    for (const node of this.nodeManager.getAllNodes()) {
      node.isSelected = false;
      node.isActive = false;
    }
    this.lastSelectedNode = null;
    this.emit('selection_changed', { nodes: [] });
    this.emit('render_needed');
  }

  /**
   * 范围选择：选择从 startNode 到 endNode 之间的所有同级节点
   */
  private selectRange(startNode: HyyMindMapNode, endNode: HyyMindMapNode): void {
    // 清除当前选中状态
    for (const node of this.nodeManager.getAllNodes()) {
      node.isSelected = false;
    }

    // 检查是否是同级节点
    if (startNode.parent !== endNode.parent) {
      // 如果不是同级节点，只选中这两个节点
      startNode.isSelected = true;
      endNode.isSelected = true;
      this.lastSelectedNode = endNode;
      return;
    }

    // 获取父节点的子节点列表
    const parent = startNode.parent;
    if (!parent) {
      // 如果是根节点，只选中自己
      startNode.isSelected = true;
      this.lastSelectedNode = endNode;
      return;
    }

    const siblings = parent.children;
    const startIndex = siblings.indexOf(startNode);
    const endIndex = siblings.indexOf(endNode);

    if (startIndex === -1 || endIndex === -1) return;

    // 选中范围内的所有同级节点
    const [rangeStart, rangeEnd] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
    for (let i = rangeStart; i <= rangeEnd; i++) {
      siblings[i].isSelected = true;
    }

    this.lastSelectedNode = endNode;
  }
}
