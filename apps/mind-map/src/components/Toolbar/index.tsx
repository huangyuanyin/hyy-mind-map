import React from 'react';
import { ToolbarButton } from './ToolbarButton';
import DeleteIcon from '../../assets/icons/ui/toolbar-delete.svg?react';
import SiblingIcon from '../../assets/icons/ui/toolbar-sibling.svg?react';
import ChildIcon from '../../assets/icons/ui/toolbar-child.svg?react';
import StyleIcon from '../../assets/icons/ui/toolbar-style.svg?react';
import './styles.css';

interface ToolbarProps {
  /** 是否有选中的节点 */
  hasSelectedNode: boolean;
  /** 是否是根节点 */
  isRootNode: boolean;
  /** 删除节点 */
  onDelete: () => void;
  /** 添加同级节点 */
  onAddSibling: () => void;
  /** 添加子节点 */
  onAddChild: () => void;
  /** 打开样式面板 */
  onOpenStyle: () => void;
}

/**
 * 顶部节点操作工具栏
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  hasSelectedNode,
  isRootNode,
  onDelete,
  onAddSibling,
  onAddChild,
  onOpenStyle,
}) => {
  return (
    <div className="mind-map-toolbar">
      {/* 删除节点按钮 */}
      <ToolbarButton
        label="删除节点"
        disabled={!hasSelectedNode || isRootNode}
        onClick={onDelete}
        icon={<DeleteIcon />}
        hoverColor="#fff1f0"
        hoverBorderColor="#ff4d4f"
      />

      {/* 同级节点按钮 */}
      <ToolbarButton
        label="同级节点"
        disabled={!hasSelectedNode || isRootNode}
        onClick={onAddSibling}
        icon={<SiblingIcon />}
        hoverColor="#e6f7ff"
        hoverBorderColor="#1890ff"
      />

      {/* 子节点按钮 */}
      <ToolbarButton
        label="子节点"
        disabled={!hasSelectedNode}
        onClick={onAddChild}
        icon={<ChildIcon />}
        hoverColor="#f6ffed"
        hoverBorderColor="#52c41a"
      />

      {/* 样式按钮 */}
      <ToolbarButton
        label="样式"
        disabled={false}
        onClick={onOpenStyle}
        icon={<StyleIcon />}
        hoverColor="#fff7e6"
        hoverBorderColor="#fa8c16"
      />
    </div>
  );
};
