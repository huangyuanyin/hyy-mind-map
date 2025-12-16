/**
 * 布局相关常量
 */
export const LAYOUT = {
  /** 节点之间的垂直间距 */
  NODE_SPACING: 30,
  /** 节点之间的水平间距 */
  HORIZONTAL_GAP: 100,
  /** 节点最小宽度 */
  MIN_NODE_WIDTH: 120,
  /** 节点最大宽度（超过则换行） */
  MAX_NODE_WIDTH: 420,
  /** 节点最小高度 */
  MIN_NODE_HEIGHT: 41,
} as const;

/**
 * 缩放相关常量
 */
export const ZOOM = {
  /** 最小缩放比例 */
  MIN_SCALE: 0.1,
  /** 最大缩放比例 */
  MAX_SCALE: 5,
  /** 每次缩放的步长 */
  STEP: 0.1,
  /** 滚轮缩放系数 */
  WHEEL_FACTOR: 0.02,
} as const;

/**
 * 拖拽相关常量
 */
export const DRAG = {
  /** 拖拽阈值 */
  THRESHOLD: 3,
} as const;

/**
 * 展开/收起指示器常量
 */
export const EXPAND_INDICATOR = {
  /** 圆形半径 */
  CIRCLE_RADIUS: 8,
  /** 距离节点边缘的距离 */
  MARGIN: 6,
  /** 点击检测时额外增加的半径 */
  CLICK_TOLERANCE: 2,
  /** 减号符号的半宽度 */
  SYMBOL_HALF_WIDTH: 4,
  /** 连线宽度 */
  LINE_WIDTH: 2,
} as const;

/**
 * 图标相关常量
 */
export const ICON = {
  /** 图标大小 */
  SIZE: 20,
  /** 图标与文本之间的间距 */
  TEXT_PADDING: 6,
  /** 多个图标之间的间距 */
  GAP: 4,
  /** 图标显示顺序 */
  ORDER: ['priority', 'progress', 'flag', 'star', 'avatar', 'arrow'] as const,
} as const;

/**
 * 阴影相关常量
 */
export const SHADOW = {
  /** 阴影颜色 */
  COLOR: 'rgba(0, 0, 0, 0.12)',
  /** 阴影模糊半径 */
  BLUR: 6,
  /** 阴影垂直偏移 */
  OFFSET_Y: 2,
} as const;

/**
 * 鼠标按钮常量
 */
export const MOUSE_BUTTON = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2,
} as const;

/**
 * 表格相关常量
 */
export const TABLE = {
  CELL_PADDING_X: 12,
  CELL_PADDING_Y: 8,
  CELL_FONT_SIZE: 13,
  BORDER_WIDTH: 1,
  MARGIN_TOP: 12,
  MARGIN_RIGHT: 8,
  MARGIN_BOTTOM: 8,
  MARGIN_LEFT: 12,
  MIN_CELL_WIDTH: 60,
  MAX_CELL_WIDTH: 310,
  NODE_BORDER_WIDTH: 4,
  EXTRA_PADDING: 24,
} as const;

export * from './themes';
export { DEFAULT_THEME, COLOR_LIGHT_VARIANTS, getLightColor } from './theme';

