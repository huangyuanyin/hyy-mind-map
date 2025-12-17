import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { Rect, DragPreviewState, DropPosition, ImageData } from './index';

/**
 * 事件类型
 */
export type EventType =
  | 'node_click'
  | 'node_dblclick'
  | 'node_mousedown'
  | 'node_mouseup'
  | 'node_drag'
  | 'node_drop'
  | 'drag_preview_change'
  | 'canvas_mousedown'
  | 'canvas_click'
  | 'canvas_drag'
  | 'zoom'
  | 'render_needed'
  | 'selection_changed'
  | 'scale_change'
  | 'tableMenuTrigger'
  | 'imagePreview';

/**
 * 事件数据
 */
export interface EventData {
  node?: HyyMindMapNode;
  nodes?: HyyMindMapNode[];
  x?: number;
  y?: number;
  deltaX?: number;
  deltaY?: number;
  delta?: number;
  scale?: number;
  event?: MouseEvent;
  selectionRect?: Rect;
  dragPreview?: DragPreviewState;
  dropTarget?: HyyMindMapNode;
  dropPosition?: DropPosition;
  nodeId?: string;
  type?: 'row' | 'column';
  index?: number;
  rect?: DOMRect;
  imageData?: ImageData;
}

/**
 * 事件处理函数
 */
export type EventHandler = (data: EventData) => void;

/**
 * 事件监听器映射
 */
export type EventListeners = Map<EventType, EventHandler[]>;

