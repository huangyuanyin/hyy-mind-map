import React, { useRef } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { truncateUrl } from '../utils/url';
import { IconLink, IconEdit, IconDelete } from './Icon';
import type { Position } from '../types/hyperlink';
import './HyperlinkPreview.css';

interface HyperlinkPreviewProps {
  /** 是否显示 */
  visible: boolean;
  /** 链接 URL */
  url: string;
  /** 链接文本 */
  text: string;
  /** 悬浮框位置 */
  position: Position;
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
  useClickOutside(containerRef, onClose, visible);

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
        <IconLink width={16} height={16} className="hyperlink-preview-icon" />
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
          <IconEdit width={16} height={16} />
        </button>
        <button
          className="hyperlink-preview-btn delete-btn"
          onClick={onDelete}
          title="删除"
        >
          <IconDelete width={16} height={16} />
        </button>
      </div>
    </div>
  );
};

export default HyperlinkPreview;

