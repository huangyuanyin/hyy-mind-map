import React from 'react';
import { Menu } from '@arco-design/web-react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trash } from 'iconoir-react';
import { MenuItem, MenuDivider } from '../ContextMenu/MenuItem';
import type { TableMenuProps } from './const';
import { stopPropagation, calculateMenuPosition, getMenuClassName } from './helper';
import './styles.css';

const ICON_SIZE = 18;
const ICON_STROKE_WIDTH = 1.5;

/**
 * 表格操作菜单
 */
export const TableMenu: React.FC<TableMenuProps> = ({
  visible,
  type,
  position,
  canDelete,
  onInsertBefore,
  onInsertAfter,
  onDelete,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!visible) return null;

  const menuPosition = calculateMenuPosition(position, type);
  const isRowMenu = type === 'row';

  return (
    <div
      className={getMenuClassName(type)}
      style={{
        position: 'fixed',
        left: menuPosition.left,
        top: menuPosition.top,
        zIndex: 10000,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
    >
      <Menu className="table-menu">
        <MenuItem
          key="insertBefore"
          onClick={onInsertBefore}
          icon={
            isRowMenu ? (
              <ArrowUp width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
            ) : (
              <ArrowLeft width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
            )
          }
          label={isRowMenu ? '在上方插入' : '在左侧插入'}
        />
        <MenuItem
          key="insertAfter"
          onClick={onInsertAfter}
          icon={
            isRowMenu ? (
              <ArrowDown width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
            ) : (
              <ArrowRight width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
            )
          }
          label={isRowMenu ? '在下方插入' : '在右侧插入'}
        />
        <MenuDivider />
        <MenuItem
          key="delete"
          onClick={onDelete}
          disabled={!canDelete}
          icon={<Trash width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />}
          label={isRowMenu ? '删除行' : '删除列'}
          danger
        />
      </Menu>
    </div>
  );
};

export * from './const';

