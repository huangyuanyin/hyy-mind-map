import React from 'react';
import { Menu } from '@arco-design/web-react';

interface MenuItemProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  onClick,
  icon,
  label,
  shortcut,
  disabled = false,
  danger = false,
}) => {
  return (
    <Menu.Item
      key={label}
      onClick={onClick}
      disabled={disabled}
      style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
    >
      <span className="menu-item-content">
        <span className="menu-item-left">
          <span className={`menu-item-icon ${danger && !disabled ? 'danger' : ''}`}>
            {icon}
          </span>
          <span className={danger && !disabled ? 'danger-text' : ''}>
            {label}
          </span>
        </span>
        {shortcut && (
          <span className="menu-item-shortcut">{shortcut}</span>
        )}
      </span>
    </Menu.Item>
  );
};

export const MenuDivider: React.FC = () => (
  <div
    style={{
      height: '1px',
      background: '#e5e5e5',
      margin: '4px 12px',
    }}
  />
);
