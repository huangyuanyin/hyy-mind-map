import type { TableOperationType } from 'hyy-mind-map';

/**
 * 菜单类型
 */
export type TableMenuType = 'row' | 'column';

/**
 * 菜单位置
 */
export interface MenuPosition {
  x: number;
  y: number;
}

/**
 * 表格菜单 Props
 */
export interface TableMenuProps {
  /** 是否可见 */
  visible: boolean;
  /** 菜单类型：行或列 */
  type: TableMenuType;
  /** 菜单位置 */
  position: MenuPosition;
  /** 是否可以删除（至少保留1行/列） */
  canDelete: boolean;
  /** 插入操作回调（上方/左侧） */
  onInsertBefore: () => void;
  /** 插入操作回调（下方/右侧） */
  onInsertAfter: () => void;
  /** 删除操作回调 */
  onDelete: () => void;
  /** 鼠标进入回调 */
  onMouseEnter: () => void;
  /** 鼠标离开回调 */
  onMouseLeave: () => void;
}

/**
 * 菜单项配置
 */
export interface MenuItemConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

/**
 * 操作名称映射
 */
export const OPERATION_NAMES: Record<TableOperationType, string> = {
  insertRowBefore: '在上方插入行',
  insertRowAfter: '在下方插入行',
  deleteRow: '删除行',
  insertColumnBefore: '在左侧插入列',
  insertColumnAfter: '在右侧插入列',
  deleteColumn: '删除列',
};

/**
 * 菜单位置偏移量
 */
export const MENU_OFFSET = {
  row: { x: 20, y: -8 },
  column: { x: -8, y: 20 },
};

