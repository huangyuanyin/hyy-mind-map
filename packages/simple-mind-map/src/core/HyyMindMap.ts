import { HyyMindMapNode } from './HyyMindMapNode';
import { NodeManager } from './NodeManager';
import { Renderer } from '../renderer/Renderer';
import { NodeDOMRenderer } from '../renderer/NodeDOMRenderer';
import { EventSystem } from '../events/EventSystem';
import { LayoutEngine } from '../layout/LayoutEngine';
import { ShortcutManager, ShortcutContext, createDefaultShortcuts } from '../shortcuts';
import { HistoryManager } from '../history/HistoryManager';
import type { NodeData, ViewState, DropPosition } from '../types';
import type { MindMapOptions } from '../MindMap';
import { ZOOM } from '../constants';

/**
 * HyyMindMap - 主控制器
 * 思维导图核心类
 */
export class HyyMindMap {
  // DOM相关
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;

  // 核心模块
  private renderer: Renderer;
  private nodeDOMRenderer: NodeDOMRenderer | null = null;
  private nodeManager: NodeManager;
  private eventSystem: EventSystem;
  private shortcutManager: ShortcutManager;
  private layoutEngine: LayoutEngine;
  private historyManager: HistoryManager;

  // 是否使用 DOM 渲染节点
  private useDOMNodes: boolean = false;

  // 视图状态
  private viewState: ViewState = {
    scale: 1,
    translateX: 0,
    translateY: 0,
  };

  // 选中的节点
  private selectedNode: HyyMindMapNode | null = null;

  // ResizeObserver
  private resizeObserver: ResizeObserver | null = null;

  // 缩放变化监听器
  private scaleChangeHandlers: Set<(scale: number) => void> = new Set();

  constructor(options: MindMapOptions) {
    // 1. 解析容器
    this.container = this.resolveContainer(options.container);

    // 2. 创建Canvas
    this.canvas = this.createCanvas(options.width, options.height);
    this.container.appendChild(this.canvas);

    // 3. 初始化核心模块
    this.useDOMNodes = options.useDOMNodes ?? false;
    this.nodeManager = new NodeManager();
    this.renderer = new Renderer(this.canvas, { 
      theme: options.theme,
      useDOMNodes: this.useDOMNodes,
    });
    this.eventSystem = new EventSystem(this.canvas, this.nodeManager);
    this.layoutEngine = new LayoutEngine(this.renderer);

    // 4. 初始化 DOM 节点渲染器（如果启用）
    if (this.useDOMNodes) {
      this.nodeDOMRenderer = new NodeDOMRenderer(this.container, options.theme);
      // 设置编辑完成回调
      this.nodeDOMRenderer.setEditCompleteCallback((nodeId, content) => {
        this.handleEditComplete(nodeId, content);
      });
      // 设置节点点击回调（选中节点）
      this.nodeDOMRenderer.setNodeClickCallback((nodeId, event) => {
        const node = this.nodeManager.findNode(nodeId);
        if (node) {
          this.setActiveNode(node);
          // 发射 node_click 事件，确保外部监听器能收到
          this.eventSystem.emit('node_click', { node, x: 0, y: 0, event });
        }
      });
      
      // 设置节点鼠标按下回调（用于拖拽）
      this.nodeDOMRenderer.setNodeMouseDownCallback((nodeId, event) => {
        const node = this.nodeManager.findNode(nodeId);
        if (node) {
          // 模拟 Canvas 的 mousedown 处理以启用拖拽
          this.eventSystem.simulateNodeMouseDown(node, event);
        }
      });

      // 设置表格更新回调
      this.nodeDOMRenderer.setTableUpdateCallback((nodeId, table) => {
        const node = this.nodeManager.findNode(nodeId);
        if (node?.config?.attachment) {
          node.config.attachment.table = table;
          // 重新布局以适应新尺寸
          this.relayout();
        }
      });

      // 设置代码块更新回调
      this.nodeDOMRenderer.setCodeBlockUpdateCallback((nodeId, codeBlock) => {
        const node = this.nodeManager.findNode(nodeId);
        if (node?.config?.attachment) {
          node.config.attachment.codeBlock = codeBlock;
          // 重新布局以适应新尺寸
          this.relayout();
        }
      });

      // 设置清除附件回调
      this.nodeDOMRenderer.setClearAttachmentCallback((nodeId) => {
        this.clearNodeAttachment(nodeId);
      });
    }

    // 5. 初始化快捷键系统
    this.shortcutManager = new ShortcutManager({
      enabled: options.enableShortcuts ?? true,
      debug: options.shortcutDebug ?? false,
    });

    // 6. 初始化历史管理器
    this.historyManager = new HistoryManager({
      maxHistorySize: options.maxHistorySize ?? 50,
      debug: options.historyDebug ?? false,
    });

    // 7. 初始化
    this.init();

    // 8. 加载数据
    if (options.data) {
      this.setData(options.data);
    }

    // 9. 初始化快捷键
    this.initShortcuts();
  }

  // ==================== 初始化方法 ====================

  /**
   * 解析容器元素
   */
  private resolveContainer(container: HTMLElement | string): HTMLElement {
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (!element) {
        throw new Error(`Container element not found: ${container}`);
      }
      return element as HTMLElement;
    }
    return container;
  }

  /**
   * 创建Canvas元素
   */
  private createCanvas(width?: number, height?: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.userSelect = 'none';

    const dpr = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();

    const canvasWidth = width ?? rect.width;
    const canvasHeight = height ?? rect.height;

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    return canvas;
  }

  /**
   * 初始化
   */
  private init(): void {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';

    this.handleResize();
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    this.eventSystem.on('node_click', ({ node }) => {
      this.setActiveNode(node ?? null);
    });

    this.eventSystem.on('node_drag', () => {
      this.render();
    });

    this.eventSystem.on('canvas_mousedown', () => {
      this.setActiveNode(null);
    });

    this.eventSystem.on('canvas_drag', ({ deltaX, deltaY }) => {
      this.viewState.translateX += deltaX ?? 0;
      this.viewState.translateY += deltaY ?? 0;
      this.syncViewState();
      this.render();
    });

    this.eventSystem.on('zoom', ({ delta, x, y }) => {
      this.handleZoom(delta ?? 0, x ?? 0, y ?? 0);
    });

    this.eventSystem.on('render_needed', () => {
      const selectionRect = this.eventSystem.getSelectionRect();
      this.renderer.setSelectionRect(selectionRect);
      this.render();
    });

    this.eventSystem.on('selection_changed', () => {
      // 可扩展：触发外部回调
    });

    // 拖拽预览变化
    this.eventSystem.on('drag_preview_change', ({ dragPreview }) => {
      this.renderer.setDragPreview(dragPreview ?? null);
      this.render();
    });

    // 节点放置
    this.eventSystem.on('node_drop', ({ node, dropTarget, dropPosition }) => {
      if (node && dropTarget && dropPosition) {
        this.moveNode(node, dropTarget, dropPosition);
      }
    });

    // 双击编辑节点
    this.eventSystem.on('node_dblclick', ({ node }) => {
      console.log('[HyyMindMap] node_dblclick event received', node);
      if (node && this.nodeDOMRenderer) {
        console.log('[HyyMindMap] Calling startEditNode');
        this.startEditNode(node.id);
      }
    });
  }

  /**
   * 开始编辑节点
   */
  public startEditNode(nodeId: string): void {
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.startEdit(nodeId);
    }
  }

  /**
   * 结束编辑节点
   */
  public endEditNode(): void {
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.endEdit();
    }
  }

  /**
   * 处理编辑完成
   */
  private handleEditComplete(nodeId: string, content: { html?: string; text?: string }): void {
    const node = this.nodeManager.findNode(nodeId);
    if (!node) return;

    // 检查内容是否真正发生变化
    const oldText = node.text || '';
    const newText = content.text || '';
    if (oldText !== newText) {
      // 保存历史记录
      this.saveHistory('editNode', `编辑节点: ${newText.substring(0, 20)}${newText.length > 20 ? '...' : ''}`);
    }

    // 更新节点内容
    node.text = content.text || '';
    node.richContent = {
      html: content.html,
      text: content.text,
    };

    // 重新布局
    this.relayout();
  }

  /**
   * 处理缩放
   */
  private handleZoom(delta: number, x: number, y: number): void {
    const oldScale = this.viewState.scale;
    const newScale = Math.max(ZOOM.MIN_SCALE, Math.min(ZOOM.MAX_SCALE, oldScale + delta));

    // 以鼠标位置为中心缩放
    const worldX = (x - this.viewState.translateX) / oldScale;
    const worldY = (y - this.viewState.translateY) / oldScale;

    this.viewState.scale = newScale;
    this.viewState.translateX = x - worldX * newScale;
    this.viewState.translateY = y - worldY * newScale;

    this.syncViewState();
    this.render();
  }

  /**
   * 初始化快捷键
   */
  private initShortcuts(): void {
    const shortcuts = createDefaultShortcuts(this, () => this.shortcutManager);
    this.shortcutManager.registerAll(shortcuts);
    this.shortcutManager.startListening(window);
    this.shortcutManager.setContext(ShortcutContext.GLOBAL);
  }

  /**
   * 同步视图状态到子模块
   */
  private syncViewState(): void {
    const { scale, translateX, translateY } = this.viewState;
    this.renderer.setTransform(scale, translateX, translateY);
    this.eventSystem.setViewState(scale, translateX, translateY);
    
    // 同步 DOM 节点渲染器的变换状态
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.setViewState(scale, translateX, translateY);
    }
  }

  /**
   * 处理容器尺寸变化
   */
  private handleResize(): void {
    this.resizeObserver = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.container.getBoundingClientRect();

      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;

      this.renderer.updateOffscreenCanvas();
      this.render();
    });

    this.resizeObserver.observe(this.container);
  }

  // ==================== 节点操作 ====================

  /**
   * 设置激活节点
   */
  private renderTimeout: number | null = null;
  private lastClickTime: number = 0;
  private lastClickedNode: HyyMindMapNode | null = null;

  public setActiveNode(node: HyyMindMapNode | null): void {
    // 如果节点已经是激活状态，不重新渲染（避免破坏正在编辑的表格和双击事件）
    // 修复：即使 isActive 为 false，如果是同一个节点也不需要重新渲染
    if (node && this.selectedNode === node) {
      // 确保状态一致
      if (!node.isActive) {
        node.isActive = true;
      }
      return;
    }

    // 检测双击：如果在 300ms 内点击了同一个节点，认为是双击，不渲染
    const now = Date.now();
    const isDoubleClick = node && this.lastClickedNode === node && (now - this.lastClickTime) < 300;
    this.lastClickTime = now;
    this.lastClickedNode = node;

    if (isDoubleClick) {
      console.log('[HyyMindMap] Double click detected, skipping render to allow dblclick event');
      // 更新状态但不渲染
      if (node) {
        // 清除所有节点的激活状态
        for (const n of this.nodeManager.getAllNodes()) {
          n.isActive = false;
        }
        node.isActive = true;
        this.selectedNode = node;
        this.shortcutManager.setContext(ShortcutContext.NODE_SELECTED);
      }
      return;
    }

    // 清除所有节点的激活状态
    for (const n of this.nodeManager.getAllNodes()) {
      n.isActive = false;
    }

    if (node) {
      node.isActive = true;
      this.selectedNode = node;
      this.shortcutManager.setContext(ShortcutContext.NODE_SELECTED);
    } else {
      this.selectedNode = null;
      this.shortcutManager.setContext(ShortcutContext.GLOBAL);
    }

    // 延迟渲染，避免破坏双击事件
    // 如果用户快速双击，第二次点击会被上面的 isDoubleClick 检测到并跳过渲染
    if (this.renderTimeout !== null) {
      clearTimeout(this.renderTimeout);
    }
    this.renderTimeout = window.setTimeout(() => {
      this.renderTimeout = null;
      this.render();
    }, 10); // 延迟 10ms，给双击事件留出时间
  }

  /**
   * 获取选中的节点
   */
  public getSelectedNode(): HyyMindMapNode | null {
    return this.selectedNode;
  }

  /**
   * 获取所有被框选的节点
   */
  public getSelectedNodes(): HyyMindMapNode[] {
    return this.eventSystem.getSelectedNodes();
  }

  /**
   * 获取所有选中的节点（包括单击选中和框选的节点）
   */
  public getAllSelectedNodes(): HyyMindMapNode[] {
    return this.nodeManager.getAllNodes().filter((node) => node.isActive || node.isSelected);
  }

  /**
   * 清除框选
   */
  public clearSelection(): void {
    this.eventSystem.clearSelection();
  }

  /**
   * 添加节点
   */
  public addNode(parentId: string, text: string): HyyMindMapNode | null {
    // 保存历史记录
    this.saveHistory('addNode', `添加节点: ${text}`);

    const node = this.nodeManager.addNode(parentId, {
      id: `node_${Date.now()}`,
      text,
    });

    if (node) {
      this.relayout();
    }

    return node;
  }

  /**
   * 粘贴节点数据（包含子节点）
   */
  public pasteNodeData(parentId: string, nodeData: NodeData): HyyMindMapNode | null {
    // 保存历史记录
    this.saveHistory('pasteNode', `粘贴节点: ${nodeData.text}`);

    // 生成新的唯一 ID
    const generateNewId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 递归添加节点
    const addNodeRecursive = (parentId: string, data: NodeData): HyyMindMapNode | null => {
      const newNode = this.nodeManager.addNode(parentId, {
        id: generateNewId(),
        text: data.text,
        config: data.config,
        richContent: data.richContent,
      });

      if (newNode && data.children && data.children.length > 0) {
        for (const childData of data.children) {
          addNodeRecursive(newNode.id, childData);
        }
      }

      return newNode;
    };

    const node = addNodeRecursive(parentId, nodeData);

    if (node) {
      this.relayout();
    }

    return node;
  }

  /**
   * 删除节点
   */
  public removeNode(id: string): boolean {
    const node = this.nodeManager.findNode(id);
    // 保存历史记录
    this.saveHistory('removeNode', `删除节点: ${node?.text || id}`);

    const success = this.nodeManager.removeNode(id);
    if (success) {
      this.relayout();
    }
    return success;
  }

  /**
   * 删除所有选中的节点
   */
  public removeSelectedNodes(): number {
    const nodesToRemove = this.getAllSelectedNodes().filter((node) => node.parent !== null);

    if (nodesToRemove.length === 0) {
      return 0;
    }

    // 保存历史记录
    this.saveHistory('removeNodes', `删除 ${nodesToRemove.length} 个节点`);

    let removedCount = 0;
    for (const node of nodesToRemove) {
      if (this.nodeManager.removeNode(node.id)) {
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.selectedNode = null;
      this.clearSelection();
      this.relayout();
    }

    return removedCount;
  }

  /**
   * 复制选中的节点
   */
  public copySelectedNodes(): NodeData[] {
    return this.getAllSelectedNodes().map((node) => node.toData());
  }

  /**
   * 更新节点
   */
  public updateNode(id: string, text: string): boolean {
    // 保存历史记录
    this.saveHistory('updateNode', `更新节点文本`);

    const success = this.nodeManager.updateNode(id, text);
    if (success) {
      this.relayout();
    }
    return success;
  }

  /**
   * 更新节点样式
   */
  public updateNodeStyle(id: string, style: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    borderColor?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
  }): boolean {
    const node = this.nodeManager.findNode(id);
    if (!node) return false;

    // 保存历史记录
    this.saveHistory('updateNodeStyle', `更新节点样式`);

    // 更新节点配置
    if (!node.config) {
      node.config = {};
    }

    if (style.backgroundColor !== undefined) {
      node.config.backgroundColor = style.backgroundColor;
    }
    if (style.textColor !== undefined) {
      node.config.textColor = style.textColor;
    }
    if (style.fontSize !== undefined) {
      node.config.fontSize = style.fontSize;
    }
    if (style.borderColor !== undefined) {
      node.config.borderColor = style.borderColor;
    }
    if (style.bold !== undefined) {
      node.config.bold = style.bold;
    }
    if (style.italic !== undefined) {
      node.config.italic = style.italic;
    }
    if (style.underline !== undefined) {
      node.config.underline = style.underline;
    }
    if (style.strikethrough !== undefined) {
      node.config.strikethrough = style.strikethrough;
    }

    // 重新布局和渲染
    this.relayout();
    return true;
  }

  /**
   * 获取节点样式
   */
  public getNodeStyle(id: string): {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    borderColor?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
  } | null {
    const node = this.nodeManager.findNode(id);
    if (!node) return null;

    return {
      backgroundColor: node.config?.backgroundColor,
      textColor: node.config?.textColor,
      fontSize: node.config?.fontSize,
      borderColor: node.config?.borderColor,
      bold: node.config?.bold,
      italic: node.config?.italic,
      underline: node.config?.underline,
      strikethrough: node.config?.strikethrough,
    };
  }

  /**
   * 为节点设置表格内容
   */
  public setNodeTable(id: string, table: { rows: { content: string; isHeader?: boolean }[][] }): boolean {
    const node = this.nodeManager.findNode(id);
    if (!node) return false;

    if (!node.config) {
      node.config = {};
    }

    node.config.attachment = {
      type: 'table',
      table: table,
    };

    this.relayout();
    return true;
  }

  /**
   * 为节点设置代码块内容
   */
  public setNodeCodeBlock(id: string, code: string, language: string = 'javascript'): boolean {
    const node = this.nodeManager.findNode(id);
    if (!node) return false;

    if (!node.config) {
      node.config = {};
    }

    node.config.attachment = {
      type: 'code',
      codeBlock: {
        code,
        language,
      },
    };

    this.relayout();
    return true;
  }

  /**
   * 清除节点的附加内容
   */
  public clearNodeAttachment(id: string): boolean {
    const node = this.nodeManager.findNode(id);
    if (!node) return false;

    if (node.config) {
      delete node.config.attachment;
    }

    this.relayout();
    return true;
  }

  /**
   * 获取节点的附加内容
   */
  public getNodeAttachment(id: string): { type: string; table?: any; codeBlock?: any } | null {
    const node = this.nodeManager.findNode(id);
    if (!node?.config?.attachment) return null;

    return node.config.attachment;
  }

  /**
   * 插入同级节点
   */
  public insertSiblingNode(nodeId: string, text: string): HyyMindMapNode | null {
    const node = this.nodeManager.findNode(nodeId);
    if (!node?.parent) {
      return null;
    }

    // 保存历史记录
    this.saveHistory('insertSiblingNode', `插入同级节点: ${text}`);

    const parent = node.parent;
    const siblingIndex = parent.children.indexOf(node);

    const newNode = parent.addChild({
      id: `node_${Date.now()}`,
      text,
    });

    // 调整位置
    parent.children.splice(parent.children.length - 1, 1);
    parent.children.splice(siblingIndex + 1, 0, newNode);

    this.nodeManager.refreshNodeMap();
    this.relayout();

    return newNode;
  }

  /**
   * 插入父节点
   */
  public insertParentNode(nodeId: string, text: string): HyyMindMapNode | null {
    const node = this.nodeManager.findNode(nodeId);
    if (!node?.parent) {
      return null;
    }

    // 保存历史记录
    this.saveHistory('insertParentNode', `插入父节点: ${text}`);

    const originalParent = node.parent;
    const nodeIndex = originalParent.children.indexOf(node);

    const newParent = new HyyMindMapNode(
      { id: `node_${Date.now()}`, text },
      originalParent
    );

    // 重建节点关系
    originalParent.children.splice(nodeIndex, 1);
    originalParent.children.splice(nodeIndex, 0, newParent);
    node.parent = newParent;
    newParent.children.push(node);

    this.nodeManager.refreshNodeMap();
    this.relayout();

    return newParent;
  }

  /**
   * 移动节点到目标位置
   */
  public moveNode(
    node: HyyMindMapNode,
    targetNode: HyyMindMapNode,
    position: DropPosition
  ): boolean {
    // 不能移动根节点
    if (!node.parent) {
      return false;
    }

    // 不能移动到自己的后代节点
    if (this.isDescendant(targetNode, node)) {
      return false;
    }

    // 保存历史记录
    this.saveHistory('moveNode', `移动节点: ${node.text}`);

    // 从原父节点中移除
    const originalParent = node.parent;
    const originalIndex = originalParent.children.indexOf(node);
    if (originalIndex === -1) {
      return false;
    }
    originalParent.children.splice(originalIndex, 1);

    // 根据放置位置处理
    if (position === 'inside') {
      // 作为目标节点的子节点
      node.parent = targetNode;
      targetNode.children.push(node);
    } else {
      // before 或 after - 作为目标节点的同级节点
      const newParent = targetNode.parent;
      if (!newParent) {
        // 目标是根节点，无法在根节点前后插入
        // 恢复原位置
        originalParent.children.splice(originalIndex, 0, node);
        return false;
      }

      node.parent = newParent;
      const targetIndex = newParent.children.indexOf(targetNode);
      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
      newParent.children.splice(insertIndex, 0, node);
    }

    // 刷新节点映射并重新布局
    this.nodeManager.refreshNodeMap();
    this.relayout();

    return true;
  }

  /**
   * 判断 nodeA 是否是 nodeB 的后代
   */
  private isDescendant(nodeA: HyyMindMapNode, nodeB: HyyMindMapNode): boolean {
    let current: HyyMindMapNode | null = nodeA;
    while (current) {
      if (current === nodeB) return true;
      current = current.parent;
    }
    return false;
  }

  // ==================== 数据操作 ====================

  /**
   * 设置数据
   */
  public setData(data: NodeData): void {
    const root = this.nodeManager.setRoot(data);
    const hasPositionData = root.x !== 0 || root.y !== 0;

    if (!hasPositionData) {
      const dpr = window.devicePixelRatio || 1;
      const centerX = this.canvas.width / (2 * dpr);
      const centerY = this.canvas.height / (2 * dpr);

      this.layoutEngine.layout(root, centerX, centerY);

      // 重置视图状态
      this.viewState = { scale: 1, translateX: 0, translateY: 0 };
      this.syncViewState();
    } else {
      this.layoutEngine.recalculateSizes(root);
    }

    this.render();
  }

  /**
   * 获取数据
   */
  public getData(): NodeData | null {
    const root = this.nodeManager.getRoot();
    return root?.toData() ?? null;
  }

  /**
   * 获取根节点
   */
  public getRoot(): HyyMindMapNode | null {
    return this.nodeManager.getRoot();
  }

  // ==================== 布局操作 ====================

  /**
   * 重新计算布局
   */
  public relayout(): void {
    const root = this.nodeManager.getRoot();
    if (!root) return;

    // 记住根节点当前的中心位置
    const rootCenterX = root.x + root.width / 2;
    const rootCenterY = root.y + root.height / 2;

    // 使用根节点当前位置重新布局，保持位置不变
    this.layoutEngine.layout(root, rootCenterX, rootCenterY);
    this.render();
  }

  // ==================== 视图操作 ====================

  /**
   * 回到根节点（将根节点居中显示）
   */
  public centerOnRoot(): void {
    const root = this.nodeManager.getRoot();
    if (!root) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasCenterX = this.canvas.width / (2 * dpr);
    const canvasCenterY = this.canvas.height / (2 * dpr);

    const rootCenterX = root.x + root.width / 2;
    const rootCenterY = root.y + root.height / 2;

    this.viewState.translateX = canvasCenterX - rootCenterX * this.viewState.scale;
    this.viewState.translateY = canvasCenterY - rootCenterY * this.viewState.scale;

    this.syncViewState();
    this.render();
  }

  /**
   * 获取当前缩放比例
   */
  public getScale(): number {
    return this.viewState.scale;
  }

  /**
   * 设置缩放比例
   */
  public setScale(scale: number): void {
    const newScale = Math.max(ZOOM.MIN_SCALE, Math.min(ZOOM.MAX_SCALE, scale));

    const dpr = window.devicePixelRatio || 1;
    const centerX = this.canvas.width / (2 * dpr);
    const centerY = this.canvas.height / (2 * dpr);

    const oldScale = this.viewState.scale;
    const worldX = (centerX - this.viewState.translateX) / oldScale;
    const worldY = (centerY - this.viewState.translateY) / oldScale;

    this.viewState.scale = newScale;
    this.viewState.translateX = centerX - worldX * newScale;
    this.viewState.translateY = centerY - worldY * newScale;

    this.syncViewState();
    this.render();
    this.notifyScaleChange();
  }

  /**
   * 缩放
   */
  public zoom(delta: number): void {
    this.setScale(this.viewState.scale * delta);
  }

  /**
   * 通知缩放变化
   */
  private notifyScaleChange(): void {
    for (const handler of this.scaleChangeHandlers) {
      handler(this.viewState.scale);
    }
  }

  /**
   * 注册缩放变化监听器
   */
  public onScaleChange(callback: (scale: number) => void): () => void {
    // 监听滚轮缩放
    const zoomHandler = () => callback(this.viewState.scale);
    this.eventSystem.on('zoom', zoomHandler);

    // 监听按钮缩放
    this.scaleChangeHandlers.add(callback);

    return () => {
      this.eventSystem.off('zoom', zoomHandler);
      this.scaleChangeHandlers.delete(callback);
    };
  }

  // ==================== 展开/收起操作 ====================

  /**
   * 展开所有节点
   */
  public expandAll(): void {
    const root = this.nodeManager.getRoot();
    if (!root) return;

    const expandNode = (node: HyyMindMapNode): void => {
      node.expanded = true;
      node.children.forEach(expandNode);
    };

    expandNode(root);
    this.relayout();
  }

  /**
   * 折叠所有节点（保留第一层子节点）
   */
  public collapseAll(): void {
    const root = this.nodeManager.getRoot();
    if (!root) return;

    const collapseNode = (node: HyyMindMapNode, level = 0): void => {
      if (level > 0) {
        node.expanded = false;
      }
      node.children.forEach((child) => collapseNode(child, level + 1));
    };

    collapseNode(root);
    this.relayout();
  }

  // ==================== 渲染 ====================

  /**
   * 渲染
   */
  public render(): void {
    const root = this.nodeManager.getRoot();
    this.renderer.render(root);
    
    // DOM 节点渲染
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.render(root);
    }
  }

  // ==================== 历史记录操作 ====================

  /**
   * 保存当前状态到历史记录
   * 在执行操作前调用
   */
  public saveHistory(operationType: string, description: string): void {
    const currentData = this.getData();
    if (currentData) {
      this.historyManager.saveState(operationType, description, currentData);
    }
  }

  /**
   * 撤销操作
   */
  public undo(): void {
    const snapshot = this.historyManager.undo(() => this.getData());
    if (snapshot) {
      this.restoreFromSnapshot(snapshot);
    }
  }

  /**
   * 重做操作
   */
  public redo(): void {
    const snapshot = this.historyManager.redo(() => this.getData());
    if (snapshot) {
      this.restoreFromSnapshot(snapshot);
    }
  }

  /**
   * 是否可以撤销
   */
  public canUndo(): boolean {
    return this.historyManager.canUndo();
  }

  /**
   * 是否可以重做
   */
  public canRedo(): boolean {
    return this.historyManager.canRedo();
  }

  /**
   * 从快照恢复数据
   */
  private restoreFromSnapshot(snapshot: NodeData): void {
    // 保存当前选中节点的 ID
    const selectedNodeId = this.selectedNode?.id;

    // 恢复数据
    this.setData(snapshot);

    // 尝试恢复选中状态
    if (selectedNodeId) {
      const node = this.nodeManager.findNode(selectedNodeId);
      if (node) {
        this.setActiveNode(node);
      }
    }
  }

  /**
   * 获取历史管理器
   */
  public getHistoryManager(): HistoryManager {
    return this.historyManager;
  }

  /**
   * 监听历史变化
   */
  public onHistoryChange(callback: () => void): () => void {
    return this.historyManager.onChange(callback);
  }

  // ==================== 其他 ====================

  /**
   * 获取快捷键管理器
   */
  public getShortcutManager(): ShortcutManager {
    return this.shortcutManager;
  }

  /**
   * 销毁
   */
  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.eventSystem.unbindEvents();
    this.shortcutManager.destroy();
    this.historyManager.destroy();
    this.canvas.remove();
    this.nodeManager.clear();
    this.selectedNode = null;
    this.scaleChangeHandlers.clear();
    
    // 清理 DOM 节点渲染器
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.destroy();
      this.nodeDOMRenderer = null;
    }
  }

  /**
   * 获取 DOM 节点渲染器
   */
  public getNodeDOMRenderer(): NodeDOMRenderer | null {
    return this.nodeDOMRenderer;
  }
}

