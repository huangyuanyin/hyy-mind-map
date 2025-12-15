import React, { useState } from 'react';
import './styles.css';

interface ZoomControlProps {
  /** 当前缩放比例 */
  scale: number;
  /** 放大 */
  onZoomIn: () => void;
  /** 缩小 */
  onZoomOut: () => void;
}

/**
 * 缩放控制面板
 */
export const ZoomControl: React.FC<ZoomControlProps> = ({
  scale,
  onZoomIn,
  onZoomOut,
}) => {
  return (
    <div className="zoom-control">
      <ZoomButton onClick={onZoomOut} title="缩小 (10%)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 8H13" stroke="#333" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </ZoomButton>

      <div className="zoom-percentage">
        {Math.round(scale * 100)}%
      </div>

      <ZoomButton onClick={onZoomIn} title="放大 (10%)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 3V13M3 8H13" stroke="#333" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </ZoomButton>
    </div>
  );
};

interface ZoomButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

const ZoomButton: React.FC<ZoomButtonProps> = ({ onClick, title, children }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      className="zoom-button"
      style={{
        background: isHovered ? '#f5f5f5' : 'white',
        borderColor: isHovered ? '#999' : '#ddd',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
};
