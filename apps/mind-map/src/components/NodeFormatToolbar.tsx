import React, { useState, useRef } from 'react';
import { IconBold, IconItalic, IconUnderline, IconStrikethrough, IconTable, IconCode, IconLink } from './Icon';
import './NodeFormatToolbar.css';

interface NodeStyle {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

interface NodeFormatToolbarProps {
  visible: boolean;
  nodeId: string | null;
  currentStyle?: NodeStyle;
  onStyleChange: (nodeId: string, style: NodeStyle) => void;
  onInsertTable: (nodeId: string) => void;
  onInsertCodeBlock: (nodeId: string) => void;
  onInsertHyperlink: (nodeId: string, selectedText: string, selectionRange: Range | null) => void;
  onClose: () => void;
}

// 预设颜色
const PRESET_COLORS = [
  { label: '红色', value: '#ffebee' },
  { label: '橙色', value: '#fff3e0' },
  { label: '黄色', value: '#fffde7' },
  { label: '绿色', value: '#e8f5e9' },
  { label: '蓝色', value: '#e3f2fd' },
  { label: '紫色', value: '#f3e5f5' },
  { label: '粉色', value: '#fce4ec' },
  { label: '青色', value: '#e0f7fa' },
  { label: '默认', value: '' },
];

// 文字颜色
const TEXT_COLORS = [
  { label: '黑色', value: '#000000' },
  { label: '灰色', value: '#666666' },
  { label: '红色', value: '#e53935' },
  { label: '橙色', value: '#fb8c00' },
  { label: '绿色', value: '#43a047' },
  { label: '蓝色', value: '#1e88e5' },
  { label: '紫色', value: '#8e24aa' },
  { label: '默认', value: '' },
];

// 字号选项
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

export const NodeFormatToolbar: React.FC<NodeFormatToolbarProps> = ({
  visible,
  nodeId,
  currentStyle,
  onStyleChange,
  onInsertTable,
  onInsertCodeBlock,
  onInsertHyperlink,
}) => {
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [showSizePanel, setShowSizePanel] = useState(false);
  const [showTextFormat, setShowTextFormat] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  if (!visible || !nodeId) return null;

  const handleBgColorChange = (color: string | undefined) => {
    onStyleChange(nodeId, { backgroundColor: color });
  };

  const handleTextColorChange = (color: string | undefined) => {
    onStyleChange(nodeId, { textColor: color });
  };

  const handleFontSizeChange = (size: number) => {
    onStyleChange(nodeId, { fontSize: size });
  };

  // 检查是否有文字格式被激活
  const hasTextFormat = currentStyle?.bold || currentStyle?.italic || currentStyle?.underline || currentStyle?.strikethrough;

  return (
    <div className="node-format-toolbar" ref={toolbarRef}>
      {/* 背景色 */}
      <div 
        className="toolbar-item"
        onMouseEnter={() => setShowBgPanel(true)}
        onMouseLeave={() => setShowBgPanel(false)}
      >
        <button
          className={`toolbar-btn ${showBgPanel ? 'active' : ''}`}
          title="背景色"
        >
          <div className="color-indicator" style={{ backgroundColor: currentStyle?.backgroundColor || '#f0f0f0' }} />
        </button>
        {showBgPanel && (
          <div className="dropdown-panel">
            <div className="color-grid">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.label}
                  className={`color-item ${color.value === '' ? 'default-item' : ''} ${currentStyle?.backgroundColor === color.value || (!currentStyle?.backgroundColor && color.value === '') ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value || '#fff' }}
                  onClick={() => handleBgColorChange(color.value)}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 文字颜色 */}
      <div 
        className="toolbar-item"
        onMouseEnter={() => setShowTextPanel(true)}
        onMouseLeave={() => setShowTextPanel(false)}
      >
        <button
          className={`toolbar-btn ${showTextPanel ? 'active' : ''}`}
          title="文字颜色"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <text x="6" y="16" fontSize="14" fontWeight="bold" fill={currentStyle?.textColor || '#333'}>A</text>
            <rect x="4" y="19" width="16" height="2.5" fill={currentStyle?.textColor || '#333'} rx="1"/>
          </svg>
        </button>
        {showTextPanel && (
          <div className="dropdown-panel">
            <div className="color-grid">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.label}
                  className={`color-item ${color.value === '' ? 'default-item' : ''} ${currentStyle?.textColor === color.value || (!currentStyle?.textColor && color.value === '') ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value || '#fff' }}
                  onClick={() => handleTextColorChange(color.value)}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 字号 */}
      <div 
        className="toolbar-item"
        onMouseEnter={() => setShowSizePanel(true)}
        onMouseLeave={() => setShowSizePanel(false)}
      >
        <button
          className={`toolbar-btn ${showSizePanel ? 'active' : ''}`}
          title="字号"
        >
          <span className="size-label">{currentStyle?.fontSize || 14}</span>
        </button>
        {showSizePanel && (
          <div className="dropdown-panel size-panel">
            <div className="size-list">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  className={`size-item ${currentStyle?.fontSize === size ? 'selected' : ''}`}
                  onClick={() => handleFontSizeChange(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* 文字格式 Aa */}
      <div 
        className="toolbar-item"
        onMouseEnter={() => setShowTextFormat(true)}
        onMouseLeave={() => setShowTextFormat(false)}
      >
        <button
          className={`toolbar-btn ${hasTextFormat ? 'active' : ''}`}
          title="文字格式"
        >
          <span className="aa-label">Aa</span>
        </button>
        {showTextFormat && (
          <div className="dropdown-panel text-format-panel">
            {/* 粗体 */}
            <button
              className={`format-btn ${currentStyle?.bold ? 'active' : ''}`}
              title="粗体"
              onClick={() => onStyleChange(nodeId, { bold: !currentStyle?.bold })}
            >
              <IconBold width={18} height={18} />
            </button>

            {/* 斜体 */}
            <button
              className={`format-btn ${currentStyle?.italic ? 'active' : ''}`}
              title="斜体"
              onClick={() => onStyleChange(nodeId, { italic: !currentStyle?.italic })}
            >
              <IconItalic width={18} height={18} />
            </button>

            {/* 下划线 */}
            <button
              className={`format-btn ${currentStyle?.underline ? 'active' : ''}`}
              title="下划线"
              onClick={() => onStyleChange(nodeId, { underline: !currentStyle?.underline })}
            >
              <IconUnderline width={18} height={18} />
            </button>

            {/* 删除线 */}
            <button
              className={`format-btn ${currentStyle?.strikethrough ? 'active' : ''}`}
              title="删除线"
              onClick={() => onStyleChange(nodeId, { strikethrough: !currentStyle?.strikethrough })}
            >
              <IconStrikethrough width={18} height={18} />
            </button>
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* 表格 */}
      <button
        className="toolbar-btn"
        title="插入表格"
        onClick={() => onInsertTable(nodeId)}
      >
        <IconTable width={20} height={20} />
      </button>

      {/* 代码块 */}
      <button
        className="toolbar-btn"
        title="插入代码块"
        onClick={() => onInsertCodeBlock(nodeId)}
      >
        <IconCode width={20} height={20} />
      </button>

      <div className="toolbar-divider" />

      {/* 超链接 */}
      <button
        className="toolbar-btn"
        title="插入超链接"
        onMouseDown={(e) => {
          e.preventDefault();
          // 在 mousedown 时获取选区（此时选区还存在）
          const selection = window.getSelection();
          const selectedText = selection && selection.toString().trim().length > 0
            ? selection.toString().trim()
            : '';
          // 保存选区的 Range，用于后续替换
          let selectionRange: Range | null = null;
          if (selection && selection.rangeCount > 0 && selectedText) {
            selectionRange = selection.getRangeAt(0).cloneRange();
          }
          onInsertHyperlink(nodeId, selectedText, selectionRange);
        }}
      >
        <IconLink width={20} height={20} />
      </button>
    </div>
  );
};

export default NodeFormatToolbar;
