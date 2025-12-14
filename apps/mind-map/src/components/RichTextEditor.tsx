import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Link } from '@tiptap/extension-link';
import { TextSelection } from '@tiptap/pm/state';
import { common, createLowlight } from 'lowlight';
import './RichTextEditor.css';

const lowlight = createLowlight(common);

// 自定义 TableCell 扩展，支持单击直接编辑
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
    };
  },
});

// 自定义 TableHeader 扩展，支持单击直接编辑
const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
    };
  },
});

interface RichTextEditorProps {
  /** 初始内容（HTML 或纯文本） */
  initialContent?: string;
  /** 保存回调 */
  onSave: (content: { html: string; text: string; json: Record<string, unknown> }) => void;
  /** 取消回调 */
  onCancel: () => void;
  /** 编辑器位置 */
  position: { x: number; y: number };
  /** 编辑器最小宽度 */
  minWidth?: number;
  /** 编辑器最小高度 */
  minHeight?: number;
}

/**
 * 富文本编辑器组件
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent = '',
  onSave,
  onCancel,
  position,
  minWidth = 200,
  minHeight = 40,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // 使用 CodeBlockLowlight 替代
      }),
      Underline,
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
        // 禁用单元格选择，这样点击就直接进入编辑
        allowTableNodeSelection: false,
      }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: initialContent,
    autofocus: 'end',
    // 设置编辑器属性，使表格单元格可以直接编辑
    editorProps: {
      handleClick: (view, _pos, event) => {
        const target = event.target as HTMLElement;
        // 检查是否点击了表格单元格
        const cell = target.closest('td, th');
        if (cell) {
          // 获取点击位置对应的文档位置
          const clickPos = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (clickPos) {
            // 将光标设置到点击位置
            const tr = view.state.tr.setSelection(
              TextSelection.near(view.state.doc.resolve(clickPos.pos))
            );
            view.dispatch(tr);
            view.focus();
            return true;
          }
        }
        return false;
      },
    },
  });

  // 保存内容
  const handleSave = useCallback(() => {
    if (editor) {
      const html = editor.getHTML();
      const text = editor.getText();
      const json = editor.getJSON() as Record<string, unknown>;
      onSave({ html, text, json });
    }
  }, [editor, onSave]);

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };

    // 处理 Escape 键取消
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
      // Ctrl/Cmd + Enter 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave, onCancel]);

  if (!editor) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="rich-text-editor-container"
      style={{
        left: position.x,
        top: position.y,
        minWidth,
        minHeight,
      }}
    >
      {/* 固定工具栏 */}
      <div className="toolbar">
        {/* 文字样式 */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="加粗 (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="斜体 (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
          title="下划线 (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          title="删除线"
        >
          <s>S</s>
        </button>

        <span className="divider" />

        {/* 颜色 */}
        <input
          type="color"
          onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
          title="文字颜色"
          className="color-picker"
        />

        <span className="divider" />

        {/* 代码块 */}
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
          title="代码块"
        >
          {'</>'}
        </button>

        {/* 表格 */}
        <button
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="插入表格"
        >
          表格
        </button>

        <span className="divider" />

        {/* 操作按钮 */}
        <button className="save-btn" onClick={handleSave} title="保存 (Ctrl+Enter)">
          ✓
        </button>
        <button className="cancel-btn" onClick={onCancel} title="取消 (Esc)">
          ✕
        </button>
      </div>

      {/* 编辑器内容区域 */}
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
};

export default RichTextEditor;

