import React from 'react';
import { MenuDivider, MenuItem } from './MenuItem';
import ChildNodeIcon from '@/assets/icons/ui/child-node.svg?react';
import SiblingNodeIcon from '@/assets/icons/ui/sibling-node.svg?react';
import ParentNodeIcon from '@/assets/icons/ui/parent-node.svg?react';
import CopyIcon from '@/assets/icons/ui/copy.svg?react';
import PasteIcon from '@/assets/icons/ui/paste.svg?react';
import DeleteIcon from '@/assets/icons/ui/trash.svg?react';

interface NodeContextMenuProps {
  isRootNode: boolean;
  canPaste: boolean;
  onInsertChild: () => void;
  onInsertSibling: () => void;
  onInsertParent: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
}

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  isRootNode,
  canPaste,
  onInsertChild,
  onInsertSibling,
  onInsertParent,
  onCopy,
  onPaste,
  onDelete,
}) => {
  return (
    <>
      <MenuItem
        key="insertChild"
        onClick={onInsertChild}
        icon={<ChildNodeIcon width={16} height={16} />}
        label="插入子节点"
        shortcut="Tab"
      />
      <MenuItem
        key="insertSibling"
        onClick={onInsertSibling}
        disabled={isRootNode}
        icon={<SiblingNodeIcon width={16} height={16} />}
        label="插入同级节点"
        shortcut="Enter"
      />
      <MenuItem
        key="insertParent"
        onClick={onInsertParent}
        disabled={isRootNode}
        icon={<ParentNodeIcon width={16} height={16} />}
        label="插入父节点"
      />
      <MenuDivider />
      <MenuItem
        key="copy"
        onClick={onCopy}
        icon={<CopyIcon width={16} height={16} />}
        label="复制"
        shortcut="⌘C"
      />
      <MenuItem
        key="paste"
        onClick={onPaste}
        disabled={!canPaste}
        icon={<PasteIcon width={16} height={16} />}
        label="粘贴"
        shortcut="⌘V"
      />
      <MenuDivider />
      <MenuItem
        key="delete"
        onClick={onDelete}
        disabled={isRootNode}
        icon={<DeleteIcon width={16} height={16} />}
        label="删除"
        shortcut="Delete"
        danger
      />
    </>
  );
};
