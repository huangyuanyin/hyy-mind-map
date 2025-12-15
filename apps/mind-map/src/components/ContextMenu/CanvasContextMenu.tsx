import React from 'react';
import { MenuDivider, MenuItem } from './MenuItem';
import CenterIcon from '@/assets/icons/ui/center.svg?react';
import ExpandIcon from '@/assets/icons/ui/expand.svg?react';
import CollapseIcon from '@/assets/icons/ui/collapse.svg?react';

interface CanvasContextMenuProps {
  onCenterOnRoot: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  onCenterOnRoot,
  onExpandAll,
  onCollapseAll,
}) => {
  return (
    <>
      <MenuItem
        key="centerOnRoot"
        onClick={onCenterOnRoot}
        icon={<CenterIcon width={16} height={16} />}
        label="回到根节点"
      />
      <MenuDivider />
      <MenuItem
        key="expandAll"
        onClick={onExpandAll}
        icon={<ExpandIcon width={16} height={16} />}
        label="展开所有"
        shortcut="⌘⌥/"
      />
      <MenuItem
        key="collapseAll"
        onClick={onCollapseAll}
        icon={<CollapseIcon width={16} height={16} />}
        label="折叠所有"
        shortcut="⌘⌥/"
      />
    </>
  );
};
