import type { MenuPosition, TableMenuType } from './const';
import { MENU_OFFSET } from './const';

export const stopPropagation = (e: React.MouseEvent): void => {
  e.stopPropagation();
};

/**
 * 计算菜单实际位置
 */
export const calculateMenuPosition = (
  position: MenuPosition,
  type: TableMenuType
): { left: number; top: number } => {
  const offset = MENU_OFFSET[type];
  return {
    left: position.x + offset.x,
    top: position.y + offset.y,
  };
};

/**
 * 获取菜单样式类名
 */
export const getMenuClassName = (type: TableMenuType): string => {
  return `table-${type}-menu compact-menu`;
};

