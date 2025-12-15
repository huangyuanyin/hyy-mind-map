import React from 'react';
import { Menu } from '@arco-design/web-react';
import type { ContextMenuType } from '../../hooks/useContextMenu';
import { NodeContextMenu } from './NodeContextMenu';
import { CanvasContextMenu } from './CanvasContextMenu';
import './styles.css';

interface ContextMenuProps {
  /** 是否可见 */
  visible: boolean;
  /** 位置 */
  position: { x: number; y: number };
  /** 菜单类型 */
  type: ContextMenuType;
  /** 是否可以粘贴 */
  canPaste: boolean;
  /** 是否是根节点 */
  isRootNode: boolean;
  /** 回到根节点 */
  onCenterOnRoot: () => void;
  /** 展开所有 */
  onExpandAll: () => void;
  /** 折叠所有 */
  onCollapseAll: () => void;
  /** 插入子节点 */
  onInsertChild: () => void;
  /** 插入同级节点 */
  onInsertSibling: () => void;
  /** 插入父节点 */
  onInsertParent: () => void;
  /** 删除节点 */
  onDelete: () => void;
  /** 复制节点 */
  onCopy: () => void;
  /** 粘贴节点 */
  onPaste: () => void;
}

/**
 * ContextMenu - 右键菜单
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  position,
  type,
  canPaste,
  isRootNode,
  onCenterOnRoot,
  onExpandAll,
  onCollapseAll,
  onInsertChild,
  onInsertSibling,
  onInsertParent,
  onDelete,
  onCopy,
  onPaste,
}) => {
  if (!visible) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="context-menu-container"
      style={{ left: position.x, top: position.y }}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      onContextMenu={stopPropagation}
    >
      <Menu className="context-menu">
        {type === 'node' ? (
          <NodeContextMenu
            isRootNode={isRootNode}
            canPaste={canPaste}
            onInsertChild={onInsertChild}
            onInsertSibling={onInsertSibling}
            onInsertParent={onInsertParent}
            onCopy={onCopy}
            onPaste={onPaste}
            onDelete={onDelete}
          />
        ) : (
          <CanvasContextMenu
            onCenterOnRoot={onCenterOnRoot}
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
          />
        )}
      </Menu>
    </div>
  );
};
