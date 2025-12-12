import type { NodeData, Theme } from './types';
import { HyyMindMapNode } from './core/HyyMindMapNode';
import { NodeManager } from './core/NodeManager';
import { StateManager } from './core/StateManager';
import { CompositeRenderer } from './renderer/CompositeRenderer';
import { NodeDOMRenderer } from './renderer/NodeDOMRenderer';
import { LayoutEngine } from './layout/LayoutEngine';
import { HistoryManager } from './history/HistoryManager';
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

    // 4. 初始化渲染层
    this.renderer = new CompositeRenderer(this.canvas, {
      theme: options.theme,
      useDOMNodes: options.useDOMNodes,
    });

    this.layoutEngine = new LayoutEngine(this.renderer);

    // 5. 初始化 DOM 节点渲染器（如果启用）
    if (options.useDOMNodes) {
      this.nodeDOMRenderer = new NodeDOMRenderer(this.container, options.theme);
      this.setupDOMRendererCallbacks();
    }

    // 6. 初始化历史管理器
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
      this.shortcutManager = new ShortcutManager({ enabled: true });
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
    // 视图状态变更 -> 更新渲染器和调度渲染
    this.stateManager.on('view:change', (state) => {
      const { scale, translateX, translateY } = state.view;
      this.renderer.setTransform(scale, translateX, translateY);
      if (this.nodeDOMRenderer) {
        this.nodeDOMRenderer.setViewState(scale, translateX, translateY);
      }
      this.scheduleRender();
    });

    // 选择状态变更 -> 调度渲染
    this.stateManager.on('selection:change', () => {
      this.scheduleRender();
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
    this.shortcutManager.registerAll(shortcuts);
    this.shortcutManager.startListening(window);
    this.shortcutManager.setContext(ShortcutContext.GLOBAL);
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

    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.destroy();
      this.nodeDOMRenderer = null;
    }

    this.canvas.remove();
    this.nodeManager.clear();
  }
}
