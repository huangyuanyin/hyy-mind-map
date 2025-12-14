import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { isValidUrl, normalizeUrl } from '../utils/url';
import { IconCheck, IconDelete } from './Icon';
import type { HyperlinkMode, Position } from '../types/hyperlink';
import './HyperlinkPopover.css';

interface HyperlinkPopoverProps {
  /** 是否显示 */
  visible: boolean;
  /** 模式：insert-插入新超链接，edit-编辑现有超链接 */
  mode?: HyperlinkMode;
  /** 是否有选中的文字（决定显示哪种模式，仅在 insert 模式下有效） */
  hasSelectedText: boolean;
  /** 选中的文字内容 */
  selectedText?: string;
  /** 初始文本（编辑模式下使用） */
  initialText?: string;
  /** 初始 URL（编辑模式下使用） */
  initialUrl?: string;
  /** 悬浮框位置 */
  position: Position;
  /** 确认回调 */
  onConfirm: (text: string, url: string) => void;
  /** 删除回调（仅编辑模式有效） */
  onDelete?: () => void;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 超链接输入悬浮框组件
 */
export const HyperlinkPopover: React.FC<HyperlinkPopoverProps> = ({
  visible,
  mode = 'insert',
  hasSelectedText,
  selectedText = '',
  initialText = '',
  initialUrl = '',
  position,
  onConfirm,
  onDelete,
  onClose,
}) => {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState(false);
  const [textError, setTextError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = mode === 'edit';

  useEffect(() => {
    if (visible) {
      // 编辑模式使用 initialText，插入模式使用 selectedText
      setText(isEditMode ? initialText : selectedText);
      setUrl(initialUrl);
      setUrlError(false);
      setTextError(false);
      setTimeout(() => {
        // 编辑模式先聚焦文本输入框，插入模式根据是否有选中文字决定
        if (isEditMode) {
          textInputRef.current?.focus();
          textInputRef.current?.select();
        } else if (hasSelectedText) {
          urlInputRef.current?.focus();
        } else {
          textInputRef.current?.focus();
        }
      }, 50);
    }
  }, [visible, hasSelectedText, selectedText, initialText, initialUrl, isEditMode]);

  // 点击外部关闭
  useClickOutside(containerRef, onClose, visible);

  // ESC 关闭，Enter 确认
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [visible, onClose, url, text, hasSelectedText]);

  const handleConfirm = useCallback(() => {
    const normalizedUrl = normalizeUrl(url);
    // 插入模式且有选中文字：使用 selectedText
    // 插入模式无选中文字：使用 text
    // 编辑模式：使用 text（可编辑）
    const finalText = (hasSelectedText && !isEditMode) ? selectedText : text.trim();

    // 验证
    let hasError = false;
    
    if (!isValidUrl(normalizedUrl)) {
      setUrlError(true);
      hasError = true;
    } else {
      setUrlError(false);
    }

    // 需要验证文本（编辑模式或插入模式无选中文字）
    if ((isEditMode || !hasSelectedText) && !finalText) {
      setTextError(true);
      hasError = true;
    } else {
      setTextError(false);
    }

    if (hasError) return;

    onConfirm(finalText, normalizedUrl);
    onClose();
  }, [url, text, hasSelectedText, isEditMode, selectedText, onConfirm, onClose]);

  if (!visible) return null;

  return (
    <>
      {/* 遮罩层 - 阻止下层节点的 hover 和交互 */}
      <div className="hyperlink-popover-backdrop" onClick={onClose} />

      {/* 悬浮框 */}
      <div
        ref={containerRef}
        className="hyperlink-popover"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="hyperlink-popover-header">
          <span className="hyperlink-popover-title">
            {isEditMode ? '编辑超链接' : '插入超链接'}
          </span>
        </div>

        <div className="hyperlink-popover-body">
          {/* 编辑模式或插入模式无选中文字时，显示文本输入框 */}
          {(isEditMode || !hasSelectedText) && (
            <div className={`hyperlink-input-group ${textError ? 'has-error' : ''}`}>
              <label className="hyperlink-input-label">文本</label>
              <input
                ref={textInputRef}
                type="text"
                className="hyperlink-input"
                placeholder="输入链接文本"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (e.target.value.trim()) setTextError(false);
                }}
              />
            </div>
          )}

          {/* URL 输入框 */}
          <div className={`hyperlink-input-row ${urlError ? 'has-error' : ''}`}>
            <label className="hyperlink-input-label">链接</label>
            <input
              ref={urlInputRef}
              type="text"
              className="hyperlink-input"
              placeholder="输入或粘贴 URL"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (e.target.value.trim()) setUrlError(false);
              }}
            />
            <button
              className="hyperlink-confirm-btn"
              onClick={handleConfirm}
              title="确认"
            >
              <IconCheck width={14} height={14} />
            </button>
            {isEditMode && onDelete && (
              <button
                className="hyperlink-delete-btn"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                title="删除超链接"
              >
                <IconDelete width={14} height={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default HyperlinkPopover;

