/**
 * 超链接悬浮框模式
 */
export type HyperlinkMode = 'insert' | 'edit';

/**
 * 位置坐标
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * 超链接悬浮框状态
 */
export interface HyperlinkPopoverState {
  visible: boolean;
  mode: HyperlinkMode;
  hasSelectedText: boolean;
  selectedText: string;
  initialText: string;
  initialUrl: string;
  position: Position;
  /** 编辑模式下的节点 ID */
  nodeId?: string | null;
  /** 编辑模式下的链接元素 */
  element?: HTMLAnchorElement | null;
}

/**
 * 超链接预览状态
 */
export interface HyperlinkPreviewState {
  visible: boolean;
  url: string;
  text: string;
  position: Position;
  nodeId: string | null;
  element: HTMLAnchorElement | null;
}
