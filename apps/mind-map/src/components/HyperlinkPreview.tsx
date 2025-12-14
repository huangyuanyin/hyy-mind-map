import React, { useRef, useEffect } from 'react';
import './HyperlinkPreview.css';

interface HyperlinkPreviewProps {
  /** 是否显示 */
  visible: boolean;
  /** 链接 URL */
  url: string;
  /** 链接文本 */
  text: string;
  /** 悬浮框位置 */
  position: { x: number; y: number };
  /** 编辑回调 */
  onEdit: () => void;
  /** 删除回调 */
  onDelete: () => void;
  /** 关闭回调 */
  onClose: () => void;
  /** 鼠标进入悬浮框 */
  onMouseEnter?: () => void;
  /** 鼠标离开悬浮框 */
  onMouseLeave?: () => void;
}

/**
 * 截断 URL 显示
 */
const truncateUrl = (url: string, maxLength: number = 40): string => {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength) + '...';
};

/**
 * 超链接预览悬浮框组件
 */
export const HyperlinkPreview: React.FC<HyperlinkPreviewProps> = ({
  visible,
  url,
  text,
  position,
  onEdit,
  onDelete,
  onClose,
  onMouseEnter,
  onMouseLeave,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="hyperlink-preview"
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 链接图标和 URL */}
      <div className="hyperlink-preview-content">
        <svg className="hyperlink-preview-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="hyperlink-preview-url"
          title={url}
        >
          {truncateUrl(url)}
        </a>
      </div>

      {/* 操作按钮 */}
      <div className="hyperlink-preview-actions">
        <button
          className="hyperlink-preview-btn edit-btn"
          onClick={onEdit}
          title="编辑"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          className="hyperlink-preview-btn delete-btn"
          onClick={onDelete}
          title="删除"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default HyperlinkPreview;

