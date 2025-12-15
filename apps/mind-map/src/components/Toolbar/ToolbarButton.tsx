import React, { useState } from 'react';

interface ToolbarButtonProps {
  /** 按钮标签 */
  label: string;
  /** 是否禁用 */
  disabled: boolean;
  /** 点击事件 */
  onClick: () => void;
  /** 图标 */
  icon: React.ReactNode;
  /** hover 背景颜色 */
  hoverColor: string;
  /** hover 边框颜色 */
  hoverBorderColor: string;
}

/**
 * 工具栏按钮
 */
export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  label,
  disabled,
  onClick,
  icon,
  hoverColor,
  hoverBorderColor,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    if (!disabled) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '8px 12px',
    border: '1px solid #d9d9d9',
    borderRadius: '6px',
    background: disabled ? '#f5f5f5' : (isHovered ? hoverColor : 'white'),
    borderColor: disabled ? '#d9d9d9' : (isHovered ? hoverBorderColor : '#d9d9d9'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={buttonStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {icon}
      <span className="toolbar-button-label">{label}</span>
    </button>
  );
};
