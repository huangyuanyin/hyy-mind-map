// ==================== 核心类 ====================
// MindMap 主类
export { MindMap } from './MindMap';
export type { MindMapOptions } from './MindMap';

// 旧的 HyyMindMap（已废弃，保留用于兼容）
export { HyyMindMap } from './core/HyyMindMap';

// 核心组件
export { HyyMindMapNode } from './core/HyyMindMapNode';
export { NodeManager } from './core/NodeManager';
export { StateManager } from './core/StateManager';
export type {
  AppState,
  SelectionState,
  DragState,
  BoxSelectionState,
  EditState,
  StateChangeEvent
} from './core/StateManager';

// 渲染器
export { CompositeRenderer } from './renderer/CompositeRenderer';
export { Renderer } from './renderer/Renderer';
export { NodeDOMRenderer } from './renderer/NodeDOMRenderer';
export type { EditCompleteCallback, NodeClickCallback, NodeMouseDownCallback, ClearAttachmentCallback } from './renderer/NodeDOMRenderer';

// 事件系统
export { EventSystem } from './events/EventSystem';

// 布局引擎
export { LayoutEngine } from './layout';

// 服务层（新增）
export { NodeService, ViewService, SelectionService } from './services';
export type { NodeOperationResult, ViewPort } from './services';

// 工具类（新增）
export { CoordinateUtils, GeometryUtils, PerformanceUtils, TreeUtils } from './utils';

// 验证器（新增）
export { NodeValidator, ViewValidator } from './validators';
export type { ValidationResult } from './validators';

// ==================== 历史管理 ====================
export { HistoryManager } from './history';
export type { HistoryRecord, HistoryManagerOptions } from './history';

// ==================== 快捷键系统 ====================
export { ShortcutManager, ShortcutContext, createDefaultShortcuts, SHORTCUT_CATEGORIES } from './shortcuts';

// 节点命令
export {
  InsertChildNodeCommand,
  InsertSiblingNodeCommand,
  InsertParentNodeCommand,
  DeleteNodeCommand,
  MoveNodeUpCommand,
  MoveNodeDownCommand,
  CopyNodeCommand,
  PasteNodeCommand,
  ToggleNodeExpandCommand,
  ExpandNodeCommand,
  CollapseNodeCommand,
  ExpandAllCommand,
  CollapseAllCommand,
  ToggleExpandAllCommand,
} from './shortcuts/commands/NodeCommands';

// 画布命令
export {
  ZoomInCommand,
  ZoomOutCommand,
  ZoomResetCommand,
  CenterOnRootCommand,
} from './shortcuts/commands/CanvasCommands';

// 历史命令
export {
  UndoCommand,
  RedoCommand,
} from './shortcuts/commands/HistoryCommands';

// ==================== 常量 ====================
export { LAYOUT, ZOOM, DRAG, EXPAND_INDICATOR, ICON, SHADOW, MOUSE_BUTTON } from './constants';
export { DEFAULT_THEME, getLightColor } from './constants/theme';

// ==================== 类型 ====================
export type {
  NodeData,
  NodeConfig,
  RichContent,
  Theme,
  Rect,
  BoundingBox,
  Point,
  ViewState,
  Direction,
  TextMeasurement,
} from './types';

export type { EventType, EventData, EventHandler } from './types/events';

export type {
  IRenderer,
  INodeManager,
  IEventSystem,
  ILayoutEngine,
  IShortcutManager,
} from './types/interfaces';

export type { Command, ShortcutConfig, KeyInfo, ShortcutManagerOptions } from './shortcuts';
