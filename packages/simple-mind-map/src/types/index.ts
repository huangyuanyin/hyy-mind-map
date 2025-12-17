import type { HyyMindMapNode } from '../core/HyyMindMapNode';

/**
 * 富文本内容
 */
export interface RichContent {
  /** HTML 格式内容 */
  html?: string;
  /** JSON 格式内容（Tiptap 格式） */
  json?: Record<string, unknown>;
  /** 纯文本内容 */
  text?: string;
}

/**
 * 表格单元格
 */
export interface TableCell {
  content: string;
  isHeader?: boolean;
}

/**
 * 表格数据
 */
export interface TableData {
  rows: TableCell[][];
}

/**
 * 表格操作类型
 */
export type TableOperationType =
  | 'insertRowBefore'
  | 'insertRowAfter'
  | 'deleteRow'
  | 'insertColumnBefore'
  | 'insertColumnAfter'
  | 'deleteColumn';

/**
 * 代码块数据
 */
export interface CodeBlockData {
  code: string;
  language: string;
}

/**
 * 图片数据
 */
export interface ImageData {
  /** Base64 编码的图片数据 */
  base64: string;
  /** 原始文件名 */
  fileName?: string;
  /** 图片原始宽度 */
  width?: number;
  /** 图片原始高度 */
  height?: number;
  /** 显示宽度（用户可调整） */
  displayWidth?: number;
  /** 显示高度（根据宽度自动计算） */
  displayHeight?: number;
  /** 上传时间戳 */
  uploadTime?: number;
}

/**
 * 节点内容类型
 */
export type NodeContentType = 'text' | 'table' | 'code';

/**
 * 节点附加内容
 */
export interface NodeAttachment {
  /** 内容类型 */
  type: NodeContentType;
  /** 表格数据 */
  table?: TableData;
  /** 代码块数据 */
  codeBlock?: CodeBlockData;
}

/**
 * 节点数据结构
 */
export interface NodeData {
  /** 唯一节点ID */
  id: string;
  /** 节点文本内容 */
  text: string;
  /** 富文本内容 */
  richContent?: RichContent;
  /** 子节点 */
  children?: NodeData[];
  /** 自定义节点配置 */
  config?: NodeConfig;
  /** 节点X坐标（用于保存位置） */
  x?: number;
  /** 节点Y坐标（用于保存位置） */
  y?: number;
  /** 节点宽度 */
  width?: number;
  /** 节点高度 */
  height?: number;
  /** 展开状态 */
  expanded?: boolean;
  /** 左侧展开状态（仅根节点） */
  expandedLeft?: boolean;
  /** 右侧展开状态（仅根节点） */
  expandedRight?: boolean;
}

/**
 * 节点配置
 */
export interface NodeConfig {
  /** 背景颜色 */
  backgroundColor?: string;
  /** 文本颜色 */
  textColor?: string;
  /** 边框颜色 */
  borderColor?: string;
  /** 字体大小 */
  fontSize?: number;
  /** 粗体 */
  bold?: boolean;
  /** 斜体 */
  italic?: boolean;
  /** 下划线 */
  underline?: boolean;
  /** 删除线 */
  strikethrough?: boolean;
  /** 节点图标（旧格式，单个图标） */
  icon?: string;
  /**
   * 节点图标（新格式，多个图标）
   * 格式：{ priority: 'iconUrl', progress: 'iconUrl', ... }
   */
  icons?: Record<string, string>;
  /** 附加内容（表格、代码块等） */
  attachment?: NodeAttachment;
  /** 节点图片 */
  image?: ImageData;
}

/**
 * 主题配置接口
 */
export interface Theme {
  backgroundColor: string;
  nodeBackgroundColor: string;
  nodeBorderColor: string;
  nodeTextColor: string;
  nodeActiveBorderColor: string;
  nodeHoverBackgroundColor: string;
  nodeSelectedBackgroundColor: string;
  nodeSelectedBorderColor: string;
  lineColor: string;
  selectionRectColor: string;
  selectionRectFillColor: string;
  fontSize: number;
  fontFamily: string;
  padding: number;
  borderWidth: number;
  borderRadius: number;
  lineWidth: number;
}

/**
 * 矩形区域
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 边界框
 */
export interface BoundingBox extends Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * 二维坐标点
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 视图状态
 */
export interface ViewState {
  scale: number;
  translateX: number;
  translateY: number;
}

/**
 * 方向类型
 */
export type Direction = 'left' | 'right';

/**
 * 文本测量结果
 */
export interface TextMeasurement {
  width: number;
  height: number;
}

/**
 * 拖拽放置位置类型
 */
export type DropPosition = 'before' | 'after' | 'inside';

/**
 * 拖拽预览状态
 */
export interface DragPreviewState {
  /** 是否正在拖拽 */
  isDragging: boolean;
  /** 被拖拽的节点 */
  dragNode: HyyMindMapNode | null;
  /** 分身位置 */
  ghostPosition: Point | null;
  /** 目标节点 */
  dropTarget: HyyMindMapNode | null;
  /** 放置位置 */
  dropPosition: DropPosition | null;
}

