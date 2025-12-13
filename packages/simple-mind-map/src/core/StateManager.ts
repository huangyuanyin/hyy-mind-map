import type { ViewState, DragPreviewState, Point } from '../types';
import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import { ViewValidator } from '../validators';

/**
 * 选择状态
 */
export interface SelectionState {
  /** 当前激活的节点（单选） */
  activeNode: HyyMindMapNode | null;
  /** 框选的节点集合 */
  selectedNodes: Set<HyyMindMapNode>;
  /** 最后选中的节点（用于范围选择） */
  lastSelectedNode: HyyMindMapNode | null;
  /** hover 的节点 */
  hoverNode: HyyMindMapNode | null;
}

/**
 * 拖拽状态
 */
export interface DragState {
  /** 是否正在拖拽节点 */
  isDraggingNode: boolean;
  /** 是否正在拖拽画布 */
  isDraggingCanvas: boolean;
  /** 是否允许节点拖拽 */
  allowNodeDrag: boolean;
  /** 拖拽起始点 */
  dragStart: Point;
  /** 上一次鼠标位置 */
  lastMousePos: Point;
}

/**
 * 框选状态
 */
export interface BoxSelectionState {
  /** 是否正在框选 */
  isSelecting: boolean;
  /** 框选起始点 */
  start: Point | null;
  /** 框选结束点 */
  end: Point | null;
}

/**
 * 编辑状态
 */
export interface EditState {
  /** 是否正在编辑 */
  isEditing: boolean;
  /** 正在编辑的节点 */
  editingNode: HyyMindMapNode | null;
}

/**
 * 完整的应用状态
 */
export interface AppState {
  view: ViewState;
  selection: SelectionState;
  drag: DragState;
  boxSelection: BoxSelectionState;
  dragPreview: DragPreviewState;
  edit: EditState;
}

/**
 * 状态变更事件类型
 */
export type StateChangeEvent =
  | 'view:change'
  | 'selection:change'
  | 'drag:start'
  | 'drag:end'
  | 'boxSelection:change'
  | 'dragPreview:change'
  | 'edit:start'
  | 'edit:end'
  | 'state:any'; // 任何状态变更

/**
 * 状态变更监听器
 */
export type StateChangeListener = (state: Readonly<AppState>) => void;

/**
 * StateManager - 状态管理器
 */
export class StateManager {
  private state: AppState;
  private listeners: Map<StateChangeEvent, Set<StateChangeListener>> = new Map();

  constructor() {
    this.state = this.createInitialState();
  }

  /**
   * 创建初始状态
   */
  private createInitialState(): AppState {
    return {
      view: {
        scale: 1,
        translateX: 0,
        translateY: 0,
      },
      selection: {
        activeNode: null,
        selectedNodes: new Set(),
        lastSelectedNode: null,
        hoverNode: null,
      },
      drag: {
        isDraggingNode: false,
        isDraggingCanvas: false,
        allowNodeDrag: false,
        dragStart: { x: 0, y: 0 },
        lastMousePos: { x: 0, y: 0 },
      },
      boxSelection: {
        isSelecting: false,
        start: null,
        end: null,
      },
      dragPreview: {
        isDragging: false,
        dragNode: null,
        ghostPosition: null,
        dropTarget: null,
        dropPosition: null,
      },
      edit: {
        isEditing: false,
        editingNode: null,
      },
    };
  }

  // ==================== 状态读取 ====================

  /**
   * 获取完整状态（只读）
   */
  getState(): Readonly<AppState> {
    return this.state;
  }

  /**
   * 获取视图状态
   */
  getViewState(): Readonly<ViewState> {
    return this.state.view;
  }

  /**
   * 获取选择状态
   */
  getSelectionState(): Readonly<SelectionState> {
    return this.state.selection;
  }

  /**
   * 获取拖拽状态
   */
  getDragState(): Readonly<DragState> {
    return this.state.drag;
  }

  /**
   * 获取框选状态
   */
  getBoxSelectionState(): Readonly<BoxSelectionState> {
    return this.state.boxSelection;
  }

  /**
   * 获取拖拽预览状态
   */
  getDragPreviewState(): Readonly<DragPreviewState> {
    return this.state.dragPreview;
  }

  /**
   * 获取编辑状态
   */
  getEditState(): Readonly<EditState> {
    return this.state.edit;
  }

  // ==================== 视图状态更新 ====================

  /**
   * 更新视图状态
   */
  setViewState(viewState: Partial<ViewState>): void {
    const newViewState = { ...this.state.view, ...viewState };

    // 验证新状态
    const validation = ViewValidator.validateViewState(newViewState);
    if (!validation.valid) {
      console.warn(`[StateManager] Invalid view state: ${validation.error}`);
      return;
    }

    this.state.view = newViewState;
    this.notify('view:change');
    this.notify('state:any');
  }

  /**
   * 设置缩放比例
   */
  setScale(scale: number): void {
    this.setViewState({ scale });
  }

  /**
   * 设置平移
   */
  setTranslate(translateX: number, translateY: number): void {
    this.setViewState({ translateX, translateY });
  }

  // ==================== 选择状态更新 ====================

  /**
   * 设置激活节点
   */
  setActiveNode(node: HyyMindMapNode | null): void {
    this.state.selection.activeNode = node;
    if (node) {
      this.state.selection.lastSelectedNode = node;
    }
    this.notify('selection:change');
    this.notify('state:any');
  }

  /**
   * 设置 hover 节点
   */
  setHoverNode(node: HyyMindMapNode | null): void {
    this.state.selection.hoverNode = node;
    this.notify('selection:change');
    this.notify('state:any');
  }

  /**
   * 添加选中节点
   */
  addSelectedNode(node: HyyMindMapNode): void {
    this.state.selection.selectedNodes.add(node);
    this.state.selection.lastSelectedNode = node;
    this.notify('selection:change');
    this.notify('state:any');
  }

  /**
   * 移除选中节点
   */
  removeSelectedNode(node: HyyMindMapNode): void {
    this.state.selection.selectedNodes.delete(node);
    this.notify('selection:change');
    this.notify('state:any');
  }

  /**
   * 切换节点选中状态
   */
  toggleSelectedNode(node: HyyMindMapNode): void {
    if (this.state.selection.selectedNodes.has(node)) {
      this.removeSelectedNode(node);
    } else {
      this.addSelectedNode(node);
    }
  }

  /**
   * 清除所有选中节点
   */
  clearSelection(): void {
    this.state.selection.selectedNodes.clear();
    this.state.selection.activeNode = null;
    this.state.selection.lastSelectedNode = null;
    this.notify('selection:change');
    this.notify('state:any');
  }

  /**
   * 批量设置选中节点
   */
  setSelectedNodes(nodes: HyyMindMapNode[]): void {
    this.state.selection.selectedNodes.clear();
    nodes.forEach((node) => this.state.selection.selectedNodes.add(node));
    if (nodes.length > 0) {
      this.state.selection.lastSelectedNode = nodes[nodes.length - 1];
    }
    this.notify('selection:change');
    this.notify('state:any');
  }

  // ==================== 拖拽状态更新 ====================

  /**
   * 开始拖拽节点
   */
  startNodeDrag(startPoint: Point): void {
    this.state.drag.isDraggingNode = true;
    this.state.drag.allowNodeDrag = true;
    this.state.drag.dragStart = startPoint;
    this.state.drag.lastMousePos = startPoint;
    this.notify('drag:start');
    this.notify('state:any');
  }

  /**
   * 开始拖拽画布
   */
  startCanvasDrag(startPoint: Point): void {
    this.state.drag.isDraggingCanvas = true;
    this.state.drag.dragStart = startPoint;
    this.state.drag.lastMousePos = startPoint;
    this.notify('drag:start');
    this.notify('state:any');
  }

  /**
   * 更新鼠标位置
   */
  updateMousePosition(pos: Point): void {
    this.state.drag.lastMousePos = pos;
  }

  /**
   * 结束拖拽
   */
  endDrag(): void {
    this.state.drag.isDraggingNode = false;
    this.state.drag.isDraggingCanvas = false;
    this.state.drag.allowNodeDrag = false;
    this.state.drag.dragStart = { x: 0, y: 0 };
    this.notify('drag:end');
    this.notify('state:any');
  }

  // ==================== 框选状态更新 ====================

  /**
   * 开始框选
   */
  startBoxSelection(start: Point): void {
    this.state.boxSelection.isSelecting = true;
    this.state.boxSelection.start = start;
    this.state.boxSelection.end = start;
    this.notify('boxSelection:change');
    this.notify('state:any');
  }

  /**
   * 更新框选区域
   */
  updateBoxSelection(end: Point): void {
    this.state.boxSelection.end = end;
    this.notify('boxSelection:change');
    this.notify('state:any');
  }

  /**
   * 结束框选
   */
  endBoxSelection(): void {
    this.state.boxSelection.isSelecting = false;
    this.state.boxSelection.start = null;
    this.state.boxSelection.end = null;
    this.notify('boxSelection:change');
    this.notify('state:any');
  }

  // ==================== 拖拽预览状态更新 ====================

  /**
   * 更新拖拽预览
   */
  setDragPreview(preview: Partial<DragPreviewState>): void {
    this.state.dragPreview = { ...this.state.dragPreview, ...preview };
    this.notify('dragPreview:change');
    this.notify('state:any');
  }

  /**
   * 重置拖拽预览
   */
  resetDragPreview(): void {
    this.state.dragPreview = {
      isDragging: false,
      dragNode: null,
      ghostPosition: null,
      dropTarget: null,
      dropPosition: null,
    };
    this.notify('dragPreview:change');
    this.notify('state:any');
  }

  // ==================== 编辑状态更新 ====================

  /**
   * 开始编辑节点
   */
  startEdit(node: HyyMindMapNode): void {
    this.state.edit.isEditing = true;
    this.state.edit.editingNode = node;
    this.notify('edit:start');
    this.notify('state:any');
  }

  /**
   * 结束编辑
   */
  endEdit(): void {
    this.state.edit.isEditing = false;
    this.state.edit.editingNode = null;
    this.notify('edit:end');
    this.notify('state:any');
  }

  // ==================== 事件订阅 ====================

  /**
   * 订阅状态变更
   * @returns 取消订阅的函数
   */
  on(event: StateChangeEvent, listener: StateChangeListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  /**
   * 取消订阅
   */
  off(event: StateChangeEvent, listener: StateChangeListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 通知监听器
   */
  private notify(event: StateChangeEvent): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const state = this.getState();
      listeners.forEach((listener) => listener(state));
    }
  }

  // ==================== 状态快照 ====================

  /**
   * 创建状态快照（用于撤销/重做）
   */
  createSnapshot(): AppState {
    return {
      view: { ...this.state.view },
      selection: {
        activeNode: this.state.selection.activeNode,
        selectedNodes: new Set(this.state.selection.selectedNodes),
        lastSelectedNode: this.state.selection.lastSelectedNode,
        hoverNode: this.state.selection.hoverNode,
      },
      drag: { ...this.state.drag },
      boxSelection: { ...this.state.boxSelection },
      dragPreview: { ...this.state.dragPreview },
      edit: { ...this.state.edit },
    };
  }

  /**
   * 恢复状态快照
   */
  restoreSnapshot(snapshot: AppState): void {
    this.state = {
      view: { ...snapshot.view },
      selection: {
        activeNode: snapshot.selection.activeNode,
        selectedNodes: new Set(snapshot.selection.selectedNodes),
        lastSelectedNode: snapshot.selection.lastSelectedNode,
        hoverNode: snapshot.selection.hoverNode,
      },
      drag: { ...snapshot.drag },
      boxSelection: { ...snapshot.boxSelection },
      dragPreview: { ...snapshot.dragPreview },
      edit: { ...snapshot.edit },
    };

    this.notify('view:change');
    this.notify('selection:change');
    this.notify('state:any');
  }

  /**
   * 重置所有状态
   */
  reset(): void {
    this.state = this.createInitialState();
    this.notify('view:change');
    this.notify('selection:change');
    this.notify('drag:end');
    this.notify('boxSelection:change');
    this.notify('dragPreview:change');
    this.notify('edit:end');
    this.notify('state:any');
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.listeners.clear();
  }
}
