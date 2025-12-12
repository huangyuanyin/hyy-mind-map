import React, { useState, useRef } from 'react';
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
  onClose,
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" stroke="currentColor" strokeWidth="2.5" fill="none"/>
              </svg>
            </button>

            {/* 斜体 */}
            <button 
              className={`format-btn ${currentStyle?.italic ? 'active' : ''}`}
              title="斜体"
              onClick={() => onStyleChange(nodeId, { italic: !currentStyle?.italic })}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <line x1="14" y1="4" x2="10" y2="20" stroke="currentColor" strokeWidth="2.5"/>
                <line x1="8" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="2"/>
                <line x1="8" y1="20" x2="16" y2="20" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>

            {/* 下划线 */}
            <button 
              className={`format-btn ${currentStyle?.underline ? 'active' : ''}`}
              title="下划线"
              onClick={() => onStyleChange(nodeId, { underline: !currentStyle?.underline })}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 4v6a6 6 0 0 0 12 0V4" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                <line x1="4" y1="20" x2="20" y2="20" stroke="currentColor" strokeWidth="2.5"/>
              </svg>
            </button>

            {/* 删除线 */}
            <button 
              className={`format-btn ${currentStyle?.strikethrough ? 'active' : ''}`}
              title="删除线"
              onClick={() => onStyleChange(nodeId, { strikethrough: !currentStyle?.strikethrough })}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M17.5 7.5C17.5 5.5 15.5 4 12 4C8.5 4 6.5 5.5 6.5 7.5C6.5 9.5 8 10.5 12 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <path d="M6.5 16.5C6.5 18.5 8.5 20 12 20C15.5 20 17.5 18.5 17.5 16.5C17.5 14.5 16 13.5 12 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="15" y1="3" x2="15" y2="21" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </button>

      {/* 代码块 */}
      <button 
        className="toolbar-btn"
        title="插入代码块"
        onClick={() => onInsertCodeBlock(nodeId)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
};

export default NodeFormatToolbar;
