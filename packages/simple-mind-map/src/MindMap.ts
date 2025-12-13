import type { NodeData, Theme } from './types';
import { HyyMindMapNode } from './core/HyyMindMapNode';
import { NodeManager } from './core/NodeManager';
import { StateManager } from './core/StateManager';
import { CompositeRenderer } from './renderer/CompositeRenderer';
import { NodeDOMRenderer } from './renderer/NodeDOMRenderer';
import { LayoutEngine } from './layout/LayoutEngine';
import { HistoryManager } from './history/HistoryManager';
import { EventSystem } from './events/EventSystem';
import { ShortcutManager, ShortcutContext, createDefaultShortcuts } from './shortcuts';
import { NodeService } from './services/NodeService';
import { ViewService } from './services/ViewService';
import { SelectionService } from './services/SelectionService';
import { PerformanceUtils } from './utils';

/**
 * MindMap 配置选项
 */
export interface MindMapOptions {
  /** 容器元素或选择器 */
  container: HTMLElement | string;
  /** 初始数据 */
  data?: NodeData;
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** 主题配置 */
  theme?: Partial<Theme>;
  /** 是否启用快捷键 */
  enableShortcuts?: boolean;
  /** 快捷键调试模式 */
  shortcutDebug?: boolean;
  /** 是否使用 DOM 渲染节点（启用富文本编辑） */
  useDOMNodes?: boolean;
  /** 最大历史记录数量 */
  maxHistorySize?: number;
  /** 历史管理调试模式 */
  historyDebug?: boolean;
}

/**
 * MindMap - 思维导图主类（新版）
 */
export class MindMap {
  // DOM 元素
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;

  // 核心层
  private stateManager: StateManager;
  private nodeManager: NodeManager;
  private eventSystem: EventSystem;

  // 渲染层
  private renderer: CompositeRenderer;
  private nodeDOMRenderer: NodeDOMRenderer | null = null;
  private layoutEngine: LayoutEngine;

  // 服务层
  public nodeService: NodeService;
  public viewService: ViewService;
  public selectionService: SelectionService;

  // 其他模块
  private historyManager: HistoryManager;
  private shortcutManager: ShortcutManager;

  // ResizeObserver
  private resizeObserver: ResizeObserver | null = null;

  // 渲染调度器（防抖）
  private renderScheduler: ReturnType<typeof PerformanceUtils.rafDebounce>;

  constructor(options: MindMapOptions) {
    // 1. 解析容器
    this.container = this.resolveContainer(options.container);

    // 2. 创建 Canvas
    this.canvas = this.createCanvas(options.width, options.height);
    this.container.appendChild(this.canvas);

    // 3. 初始化核心层
    this.stateManager = new StateManager();
    this.nodeManager = new NodeManager();

    // 4. 初始化事件系统
    this.eventSystem = new EventSystem(this.canvas, this.nodeManager);

    // 5. 初始化渲染层
    this.renderer = new CompositeRenderer(this.canvas, {
      theme: options.theme,
      useDOMNodes: options.useDOMNodes,
    });

    this.layoutEngine = new LayoutEngine(this.renderer);

    // 6. 初始化 DOM 节点渲染器（如果启用）
    if (options.useDOMNodes) {
      this.nodeDOMRenderer = new NodeDOMRenderer(this.container, options.theme);
      this.setupDOMRendererCallbacks();
    }

    // 7. 初始化历史管理器
    this.historyManager = new HistoryManager({
      maxHistorySize: options.maxHistorySize ?? 50,
    });

    // 7. 初始化服务层
    this.nodeService = new NodeService(
      this.nodeManager,
      this.layoutEngine,
      this.historyManager
    );

    this.viewService = new ViewService(
      this.stateManager,
      this.nodeManager,
      {
        width: this.canvas.width / (window.devicePixelRatio || 1),
        height: this.canvas.height / (window.devicePixelRatio || 1),
      }
    );

    this.selectionService = new SelectionService(
      this.stateManager,
      this.nodeManager
    );

    // 8. 初始化快捷键
    if (options.enableShortcuts !== false) {
      this.shortcutManager = new ShortcutManager({ enabled: true, debug: true });
      this.initShortcuts();
    } else {
      this.shortcutManager = new ShortcutManager({ enabled: false });
    }

    // 9. 创建渲染调度器（RAF防抖）
    this.renderScheduler = PerformanceUtils.rafDebounce(() => {
      this.performRender();
    });

    // 10. 绑定状态变更监听
    this.bindStateListeners();

    // 11. 初始化
    this.init();

    // 12. 加载数据
    if (options.data) {
      this.setData(options.data);
    }
  }

  // ==================== 初始化 ====================

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
   * 创建 Canvas 元素
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
    this.bindEventSystemListeners();
  }

  /**
   * 绑定 EventSystem 的事件到 StateManager
   */
  private bindEventSystemListeners(): void {
    // 节点点击 -> 设置激活节点
    this.eventSystem.on('node_click', ({ node }) => {
      this.selectionService.setActiveNode(node ?? null);
    });

    // 节点拖拽 -> 触发渲染
    this.eventSystem.on('node_drag', () => {
      this.scheduleRender();
    });

    // 画布点击 -> 清除选择
    this.eventSystem.on('canvas_mousedown', () => {
      this.selectionService.setActiveNode(null);
    });

    // 画布拖拽 -> 更新视图状态
    this.eventSystem.on('canvas_drag', ({ deltaX, deltaY }) => {
      const state = this.stateManager.getViewState();
      this.stateManager.setViewState({
        translateX: state.translateX + (deltaX ?? 0),
        translateY: state.translateY + (deltaY ?? 0),
      });
    });

    // 缩放 -> 使用 ViewService
    this.eventSystem.on('zoom', ({ delta }) => {
      if (delta) {
        const currentScale = this.stateManager.getViewState().scale;
        const newScale = Math.max(0.1, Math.min(5, currentScale + delta * 0.1));
        this.viewService.setScale(newScale);
      }
    });

    // 渲染需求 -> 更新框选矩形并渲染
    this.eventSystem.on('render_needed', () => {
      const selectionRect = this.eventSystem.getSelectionRect();
      this.renderer.setSelectionRect(selectionRect);
      this.scheduleRender();
    });

    // 拖拽预览变化 -> 更新拖拽预览状态
    this.eventSystem.on('drag_preview_change', ({ dragPreview }) => {
      if (dragPreview) {
        this.stateManager.setDragPreview(dragPreview);
      }
    });

    // 节点放置 -> 移动节点
    this.eventSystem.on('node_drop', ({ node, dropTarget, dropPosition }) => {
      if (node && dropTarget && dropPosition) {
        // 调用 nodeService 移动节点
        const result = this.nodeService.moveNode(node.id, dropTarget.id, dropPosition);
        if (result.success) {
          this.relayout();
        }
      }
    });

    // 双击编辑节点
    this.eventSystem.on('node_dblclick', ({ node }) => {
      if (node && this.nodeDOMRenderer) {
        this.nodeDOMRenderer.startEdit(node.id);
      }
    });

    // 初始化：同步初始视图状态到 EventSystem
    const initialViewState = this.stateManager.getViewState();
    this.eventSystem.setViewState(
      initialViewState.scale,
      initialViewState.translateX,
      initialViewState.translateY
    );
  }

  /**
   * 设置 DOM 渲染器回调
   */
  private setupDOMRendererCallbacks(): void {
    if (!this.nodeDOMRenderer) return;

    // 编辑完成回调
    this.nodeDOMRenderer.setEditCompleteCallback((nodeId, content) => {
      this.handleEditComplete(nodeId, content);
    });

    // 节点点击回调
    this.nodeDOMRenderer.setNodeClickCallback((nodeId) => {
      const node = this.nodeManager.findNode(nodeId);
      if (node) {
        this.selectionService.setActiveNode(node);
        this.scheduleRender();
      }
    });

    // 节点鼠标按下回调（用于拖拽）
    this.nodeDOMRenderer.setNodeMouseDownCallback((nodeId, event) => {
      const node = this.nodeManager.findNode(nodeId);
      if (node) {
        // 使用 EventSystem 的 simulateNodeMouseDown 来处理拖拽
        this.eventSystem.simulateNodeMouseDown(node, event);
      }
    });

    // 表格更新回调
    this.nodeDOMRenderer.setTableUpdateCallback((nodeId, table) => {
      const node = this.nodeManager.findNode(nodeId);
      if (node?.config?.attachment) {
        node.config.attachment.table = table;
        this.relayout();
      }
    });

    // 代码块更新回调
    this.nodeDOMRenderer.setCodeBlockUpdateCallback((nodeId, codeBlock) => {
      const node = this.nodeManager.findNode(nodeId);
      if (node?.config?.attachment) {
        node.config.attachment.codeBlock = codeBlock;
        this.relayout();
      }
    });

    // 清除附件回调
    this.nodeDOMRenderer.setClearAttachmentCallback((nodeId) => {
      this.clearNodeAttachment(nodeId);
    });
  }

  /**
   * 绑定状态变更监听
   */
  private bindStateListeners(): void {
    // 视图状态变更 -> 更新渲染器、EventSystem 和调度渲染
    this.stateManager.on('view:change', (state) => {
      const { scale, translateX, translateY } = state.view;
      this.renderer.setTransform(scale, translateX, translateY);
      // 同步视图状态到 EventSystem（用于坐标转换）
      this.eventSystem.setViewState(scale, translateX, translateY);
      if (this.nodeDOMRenderer) {
        this.nodeDOMRenderer.setViewState(scale, translateX, translateY);
      }
      this.scheduleRender();
    });

    // 选择状态变更 -> 调度渲染并更新快捷键上下文
    this.stateManager.on('selection:change', (state) => {
      this.scheduleRender();

      // 根据选择状态动态切换快捷键上下文
      const hasSelection = state.selection.activeNode !== null || state.selection.selectedNodes.size > 0;
      if (hasSelection) {
        this.shortcutManager.setContext(ShortcutContext.NODE_SELECTED);
      } else {
        this.shortcutManager.setContext(ShortcutContext.GLOBAL);
      }
    });

    // 拖拽预览变更 -> 更新渲染器和调度渲染
    this.stateManager.on('dragPreview:change', (state) => {
      this.renderer.setDragPreview(state.dragPreview);
      this.scheduleRender();
    });

    // 框选变更 -> 更新渲染器和调度渲染
    this.stateManager.on('boxSelection:change', (state) => {
      const { start, end } = state.boxSelection;
      if (start && end) {
        const rect = {
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
        };
        this.renderer.setSelectionRect(rect);
      } else {
        this.renderer.setSelectionRect(null);
      }
      this.scheduleRender();
    });
  }

  /**
   * 初始化快捷键
   */
  private initShortcuts(): void {
    const shortcuts = createDefaultShortcuts(this as any, () => this.shortcutManager);
    console.log('[MindMap] Registering shortcuts:', shortcuts.length);
    this.shortcutManager.registerAll(shortcuts);
    this.shortcutManager.startListening(window);
    this.shortcutManager.setContext(ShortcutContext.GLOBAL);
    console.log('[MindMap] Shortcuts initialized and listening on window');
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
      this.viewService.updateViewport(rect.width, rect.height);
      this.scheduleRender();
    });

    this.resizeObserver.observe(this.container);
  }

  // ==================== 数据操作 ====================

  /**
   * 设置数据
   */
  setData(data: NodeData): void {
    const root = this.nodeManager.setRoot(data);
    const hasPositionData = root.x !== 0 || root.y !== 0;

    if (!hasPositionData) {
      const dpr = window.devicePixelRatio || 1;
      const centerX = this.canvas.width / (2 * dpr);
      const centerY = this.canvas.height / (2 * dpr);

      this.layoutEngine.layout(root, centerX, centerY);

      // 重置视图状态
      this.stateManager.setViewState({ scale: 1, translateX: 0, translateY: 0 });
    } else {
      this.layoutEngine.recalculateSizes(root);
    }

    this.scheduleRender();
  }

  /**
   * 获取数据
   */
  getData(): NodeData | null {
    const root = this.nodeManager.getRoot();
    return root?.toData() ?? null;
  }

  /**
   * 获取根节点
   */
  getRoot(): HyyMindMapNode | null {
    return this.nodeManager.getRoot();
  }

  // ==================== 渲染 ====================

  /**
   * 调度渲染（使用 RAF 防抖）
   */
  scheduleRender(): void {
    this.renderScheduler();
  }

  /**
   * 立即渲染
   */
  render(): void {
    this.performRender();
  }

  /**
   * 执行渲染
   */
  private performRender(): void {
    const root = this.nodeManager.getRoot();
    this.renderer.render(root);

    // DOM 节点渲染
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.render(root);
    }
  }

  /**
   * 重新布局
   */
  relayout(): void {
    const root = this.nodeManager.getRoot();
    if (!root) return;

    const rootCenterX = root.x + root.width / 2;
    const rootCenterY = root.y + root.height / 2;

    this.layoutEngine.layout(root, rootCenterX, rootCenterY);
    this.scheduleRender();
  }

  // ==================== 节点编辑 ====================

  /**
   * 开始编辑节点
   */
  startEditNode(nodeId: string): void {
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.startEdit(nodeId);
    }
  }

  /**
   * 结束编辑节点
   */
  endEditNode(): void {
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.endEdit();
    }
  }

  /**
   * 处理编辑完成
   */
  private handleEditComplete(nodeId: string, content: { html?: string; text?: string }): void {
    const result = this.nodeService.updateNodeText(nodeId, content.text || '');
    if (result.success && result.node) {
      result.node.richContent = {
        html: content.html,
        text: content.text,
      };
      this.relayout();
    }
  }

  /**
   * 清除节点附件
   */
  clearNodeAttachment(id: string): boolean {
    const node = this.nodeManager.findNode(id);
    if (!node) return false;

    if (node.config) {
      delete node.config.attachment;
    }

    this.relayout();
    return true;
  }

  // ==================== 历史操作 ====================

  /**
   * 撤销
   */
  undo(): void {
    const snapshot = this.historyManager.undo(() => this.getData());
    if (snapshot) {
      this.setData(snapshot);
    }
  }

  /**
   * 重做
   */
  redo(): void {
    const snapshot = this.historyManager.redo(() => this.getData());
    if (snapshot) {
      this.setData(snapshot);
    }
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.historyManager.canUndo();
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.historyManager.canRedo();
  }

  // ==================== 工具方法 ====================

  /**
   * 获取状态管理器
   */
  getStateManager(): StateManager {
    return this.stateManager;
  }

  /**
   * 获取节点管理器
   */
  getNodeManager(): NodeManager {
    return this.nodeManager;
  }

  /**
   * 获取快捷键管理器
   */
  getShortcutManager(): ShortcutManager {
    return this.shortcutManager;
  }

  // ==================== 便捷代理方法 (为命令层提供兼容性) ====================

  /**
   * 获取缩放比例
   */
  getScale(): number {
    return this.stateManager.getState().view.scale;
  }

  /**
   * 设置缩放比例
   */
  setScale(scale: number): void {
    this.viewService.setScale(scale);
  }

  /**
   * 回到根节点
   */
  centerOnRoot(): void {
    this.viewService.centerOnRoot();
  }

  /**
   * 获取选中的节点
   */
  getSelectedNode(): HyyMindMapNode | null {
    return this.stateManager.getState().selection.activeNode;
  }

  /**
   * 设置激活节点
   */
  setActiveNode(node: HyyMindMapNode | null): void {
    this.selectionService.setActiveNode(node);
  }

  /**
   * 添加节点
   */
  addNode(parentId: string, text: string): HyyMindMapNode | null {
    const result = this.nodeService.addNode(parentId, text);
    if (result.success && result.node) {
      this.relayout();
      return result.node;
    }
    return null;
  }

  /**
   * 插入同级节点
   */
  insertSiblingNode(nodeId: string, text: string): HyyMindMapNode | null {
    const result = this.nodeService.insertSiblingNode(nodeId, text);
    if (result.success && result.node) {
      this.relayout();
      return result.node;
    }
    return null;
  }

  /**
   * 插入父节点
   */
  insertParentNode(nodeId: string, text: string): HyyMindMapNode | null {
    const result = this.nodeService.insertParentNode(nodeId, text);
    if (result.success && result.node) {
      this.relayout();
      return result.node;
    }
    return null;
  }

  /**
   * 删除节点
   */
  removeNode(id: string): boolean {
    const result = this.nodeService.removeNode(id);
    if (result.success) {
      this.relayout();
      return true;
    }
    return false;
  }

  /**
   * 粘贴节点数据
   */
  pasteNodeData(parentId: string, nodeData: NodeData): HyyMindMapNode | null {
    const result = this.nodeService.pasteNodeData(parentId, nodeData);
    if (result.success && result.node) {
      this.relayout();
      return result.node;
    }
    return null;
  }

  /**
   * 获取所有选中的节点（包括激活节点和框选节点）
   */
  getAllSelectedNodes(): HyyMindMapNode[] {
    return this.selectionService.getAllSelectedNodes();
  }

  /**
   * 删除所有选中的节点
   * @returns 删除的节点数量
   */
  removeSelectedNodes(): number {
    const nodesToRemove = this.getAllSelectedNodes().filter((node) => node.parent !== null);

    if (nodesToRemove.length === 0) {
      return 0;
    }

    let removedCount = 0;
    for (const node of nodesToRemove) {
      const result = this.nodeService.removeNode(node.id);
      if (result.success) {
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.selectionService.clearSelection();
      this.relayout();
    }

    return removedCount;
  }

  /**
   * 复制所有选中的节点
   * @returns 节点数据数组
   */
  copySelectedNodes(): NodeData[] {
    return this.getAllSelectedNodes().map((node) => node.toData());
  }

  /**
   * 展开所有节点
   */
  expandAll(): void {
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
   * 折叠所有节点（保留第一层）
   */
  collapseAll(): void {
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

  /**
   * 销毁
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.stateManager.destroy();
    this.shortcutManager.destroy();
    this.historyManager.destroy();
    this.renderer.destroy();
    this.eventSystem.unbindEvents();

    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.destroy();
      this.nodeDOMRenderer = null;
    }

    this.canvas.remove();
    this.nodeManager.clear();
  }
}
