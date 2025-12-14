import React, { useState, useRef, useEffect, useCallback } from 'react';
import './HyperlinkPopover.css';

interface HyperlinkPopoverProps {
  /** 是否显示 */
  visible: boolean;
  /** 模式：insert-插入新超链接，edit-编辑现有超链接 */
  mode?: 'insert' | 'edit';
  /** 是否有选中的文字（决定显示哪种模式，仅在 insert 模式下有效） */
  hasSelectedText: boolean;
  /** 选中的文字内容 */
  selectedText?: string;
  /** 初始文本（编辑模式下使用） */
  initialText?: string;
  /** 初始 URL（编辑模式下使用） */
  initialUrl?: string;
  /** 悬浮框位置 */
  position: { x: number; y: number };
  /** 确认回调 */
  onConfirm: (text: string, url: string) => void;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 验证 URL 是否有效
 */
const isValidUrl = (url: string): boolean => {
  if (!url.trim()) return false;
  // 支持常见的 URL 格式
  const urlPattern = /^(https?:\/\/|mailto:|tel:|\/|#)/i;
  return urlPattern.test(url.trim());
};

/**
 * 自动补全 URL（如果没有协议，添加 https://）
 */
const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  // 如果已经有协议或特殊前缀，直接返回
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

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

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter') {
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
            {textError && <span className="hyperlink-error">请输入链接文本</span>}
          </div>
        )}

        {/* URL 输入框 */}
        <div className={`hyperlink-input-row ${urlError ? 'has-error' : ''}`}>
          <input
            ref={urlInputRef}
            type="text"
            className="hyperlink-input"
            placeholder="输入或粘贴一个 URL"
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        {urlError && <span className="hyperlink-error">请输入有效的 URL</span>}
      </div>
    </div>
  );
};

export default HyperlinkPopover;

