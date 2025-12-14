import { useState, useRef, useEffect, useCallback } from 'react';
import type { MindMap } from 'hyy-mind-map';
import type { HyperlinkPopoverState, HyperlinkPreviewState, Position } from '../types/hyperlink';

interface UseHyperlinkManagerProps {
  mindMapRef: React.RefObject<MindMap | null>;
  activeNodeId: string | null;
}

/**
 * 超链接管理 Hook
 */
export const useHyperlinkManager = ({ mindMapRef, activeNodeId }: UseHyperlinkManagerProps) => {
  // 超链接悬浮框状态
  const [popoverState, setPopoverState] = useState<HyperlinkPopoverState>({
    visible: false,
    mode: 'insert',
    hasSelectedText: false,
    selectedText: '',
    initialText: '',
    initialUrl: '',
    position: { x: 0, y: 0 },
    nodeId: null,
    element: null,
  });

  // 超链接预览状态
  const [previewState, setPreviewState] = useState<HyperlinkPreviewState>({
    visible: false,
    url: '',
    text: '',
    position: { x: 0, y: 0 },
    nodeId: null,
    element: null,
  });

  // Refs
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringPreviewRef = useRef<boolean>(false);
  const selectionRangeRef = useRef<Range | null>(null);
  // 编辑模式下的链接信息
  const editingLinkRef = useRef<{
    nodeId: string | null;
    element: HTMLAnchorElement | null;
    text: string;
    url: string;
  }>({ nodeId: null, element: null, text: '', url: '' });

  /**
   * 计算悬浮框位置
   */
  const calculatePopoverPosition = useCallback((nodeId: string): Position => {
    const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (nodeElement) {
      const rect = nodeElement.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - 160, // 居中显示（悬浮框宽度约 320px）
        y: rect.bottom + 10,
      };
    }
    // 默认位置在屏幕中央
    return {
      x: window.innerWidth / 2 - 160,
      y: window.innerHeight / 2 - 100,
    };
  }, []);

  /**
   * 清除选中文本的高亮
   */
  const clearSelectionHighlight = useCallback((nodeId: string | null) => {
    const highlightSpans = document.querySelectorAll('.hyperlink-selection-highlight');
    highlightSpans.forEach(highlightSpan => {
      const textNode = document.createTextNode(highlightSpan.textContent || '');
      highlightSpan.parentNode?.replaceChild(textNode, highlightSpan);
    });

    // 更新节点的 richContent
    if (nodeId && mindMapRef.current) {
      const nodeElement = document.querySelector(`[data-node-id="${nodeId}"] .node-content`);
      const node = mindMapRef.current.getNodeManager().findNode(nodeId);
      if (nodeElement && node && node.richContent) {
        node.richContent.html = nodeElement.innerHTML;
      }
    }
  }, [mindMapRef]);

  /**
   * 添加选中文本的高亮
   */
  const addSelectionHighlight = useCallback((selectionRange: Range | null) => {
    if (!selectionRange) return;

    requestAnimationFrame(() => {
      try {
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'hyperlink-selection-highlight';
        highlightSpan.style.cssText = 'background-color: #b4d7ff; border-radius: 2px;';
        selectionRange.surroundContents(highlightSpan);
      } catch (e) {
        console.log('无法高亮选中文本:', e);
      }
    });
  }, []);

  /**
   * 打开插入超链接悬浮框
   */
  const openInsertPopover = useCallback((nodeId: string, selectedText: string, selectionRange: Range | null) => {
    if (!mindMapRef.current) return;

    const node = mindMapRef.current.getNodeManager().findNode(nodeId);
    if (!node) return;

    const hasSelection = selectedText.length > 0;
    selectionRangeRef.current = selectionRange;

    // 禁用快捷键
    mindMapRef.current.getShortcutManager().disable();

    setPopoverState({
      visible: true,
      mode: 'insert',
      hasSelectedText: hasSelection,
      selectedText,
      initialText: '',
      initialUrl: '',
      position: calculatePopoverPosition(nodeId),
    });

    if (hasSelection && selectionRange) {
      addSelectionHighlight(selectionRange);
    }
  }, [mindMapRef, calculatePopoverPosition, addSelectionHighlight]);

  /**
   * 打开编辑超链接悬浮框
   */
  const openEditPopover = useCallback(() => {
    // 禁用快捷键
    if (mindMapRef.current) {
      mindMapRef.current.getShortcutManager().disable();
    }

    // 保存到 ref
    editingLinkRef.current = {
      nodeId: previewState.nodeId,
      element: previewState.element,
      text: previewState.text,
      url: previewState.url,
    };

    // 高亮被编辑的链接
    if (previewState.element) {
      previewState.element.classList.add('hyperlink-editing-highlight');
    }

    setPopoverState({
      visible: true,
      mode: 'edit',
      hasSelectedText: false,
      selectedText: '',
      initialText: previewState.text,
      initialUrl: previewState.url,
      position: previewState.position,
      nodeId: previewState.nodeId,
      element: previewState.element,
    });

    setPreviewState(prev => ({ ...prev, visible: false }));
  }, [mindMapRef, previewState]);

  /**
   * 关闭悬浮框
   */
  const closePopover = useCallback(() => {
    // 移除编辑高亮
    if (editingLinkRef.current.element) {
      editingLinkRef.current.element.classList.remove('hyperlink-editing-highlight');
    }

    setPopoverState(prev => ({ ...prev, visible: false }));
    clearSelectionHighlight(activeNodeId);
    selectionRangeRef.current = null;

    // 延迟恢复快捷键，避免 Enter 事件被快捷键系统捕获
    setTimeout(() => {
      if (mindMapRef.current) {
        mindMapRef.current.getShortcutManager().enable();
      }
    }, 100);
  }, [mindMapRef, activeNodeId, clearSelectionHighlight]);

  /**
   * 关闭预览框
   */
  const closePreview = useCallback(() => {
    setTimeout(() => {
      if (!isHoveringPreviewRef.current) {
        setPreviewState(prev => ({ ...prev, visible: false, element: null }));
      }
    }, 100);
  }, []);

  /**
   * 删除超链接
   */
  const deleteHyperlink = useCallback(() => {
    // 优先使用 ref，否则使用 previewState
    const nodeId = editingLinkRef.current.nodeId || previewState.nodeId;
    const linkText = editingLinkRef.current.text || previewState.text;
    const linkUrl = editingLinkRef.current.url || previewState.url;

    if (!mindMapRef.current || !nodeId || !linkText || !linkUrl) {
      return;
    }

    const node = mindMapRef.current.getNodeManager().findNode(nodeId);
    if (!node) {
      return;
    }

    mindMapRef.current.saveHistory('deleteHyperlink', '删除超链接');

    // 直接操作 DOM 进行替换
    const nodeContentElement = document.querySelector(`[data-node-id="${nodeId}"] .node-content`) as HTMLElement;

    if (nodeContentElement) {
      // 查找所有链接元素
      const links = nodeContentElement.querySelectorAll('a');
      let linkFound = false;

      links.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.textContent;

        // 匹配 URL 和文本
        if (href === linkUrl && text === linkText) {
          // 用文本节点替换链接元素
          const textNode = document.createTextNode(text || '');
          link.parentNode?.replaceChild(textNode, link);
          linkFound = true;
        }
      });

      // 更新节点数据
      const newHtml = nodeContentElement.innerHTML;
      const newText = nodeContentElement.textContent || '';

      if (!node.richContent) {
        node.richContent = { html: '', text: '', json: {} };
      }
      node.richContent.html = newHtml;
      node.richContent.text = newText;
      node.text = newText;

    }
    // 移除编辑高亮
    if (editingLinkRef.current.element) {
      editingLinkRef.current.element.classList.remove('hyperlink-editing-highlight');
    }

    editingLinkRef.current = { nodeId: null, element: null, text: '', url: '' };
    setPreviewState(prev => ({ ...prev, visible: false, element: null }));
    setPopoverState(prev => ({ ...prev, visible: false, element: null, nodeId: null }));

    mindMapRef.current.relayout();

    setTimeout(() => {
      if (mindMapRef.current) {
        mindMapRef.current.getShortcutManager().enable();
      }
    }, 100);

    setTimeout(() => {
      if (mindMapRef.current) {
        const stateManager = mindMapRef.current.getStateManager();
        const currentState = stateManager.getViewState();
        // 触发一个微小的变更来触发保存（scale 不变，但会触发事件）
        stateManager.setViewState({
          scale: currentState.scale,
          translateX: currentState.translateX,
          translateY: currentState.translateY,
        });
      }
    }, 200);
  }, [mindMapRef, previewState]);

  /**
   * 更新节点内容（编辑模式）
   */
  const updateNodeHyperlink = useCallback((text: string, url: string) => {
    const nodeId = editingLinkRef.current.nodeId || previewState.nodeId;
    const oldText = editingLinkRef.current.text || previewState.text;
    const oldUrl = editingLinkRef.current.url || previewState.url;

    if (!mindMapRef.current || !nodeId || !oldText || !oldUrl) {
      return;
    }

    const node = mindMapRef.current.getNodeManager().findNode(nodeId);
    if (!node) {
      return;
    }

    mindMapRef.current.saveHistory('editHyperlink', '编辑超链接');

    // 直接操作 DOM 进行替换
    const nodeContentElement = document.querySelector(`[data-node-id="${nodeId}"] .node-content`) as HTMLElement;

    if (nodeContentElement) {
      // 查找所有链接元素
      const links = nodeContentElement.querySelectorAll('a');
      let linkFound = false;

      links.forEach(link => {
        const href = link.getAttribute('href');
        const linkText = link.textContent;

        // 匹配 URL 和文本
        if (href === oldUrl && linkText === oldText) {
          // 更新链接
          link.setAttribute('href', url);
          link.textContent = text;
          link.classList.remove('hyperlink-editing-highlight');
          linkFound = true;
        }
      });
      // 更新节点数据
      const newHtml = nodeContentElement.innerHTML;
      const newText = nodeContentElement.textContent || '';

      if (!node.richContent) {
        node.richContent = { html: '', text: '', json: {} };
      }
      node.richContent.html = newHtml;
      node.richContent.text = newText;
      node.text = newText;

    }

    editingLinkRef.current = { nodeId: null, element: null, text: '', url: '' };
    setPreviewState(prev => ({ ...prev, element: null }));
    setPopoverState(prev => ({ ...prev, element: null, nodeId: null }));
    mindMapRef.current.relayout();
  }, [mindMapRef, previewState]);

  /**
   * 插入新超链接
   */
  const insertNewHyperlink = useCallback((text: string, url: string) => {
    if (!mindMapRef.current || !activeNodeId) return;

    const node = mindMapRef.current.getNodeManager().findNode(activeNodeId);
    if (!node) return;

    mindMapRef.current.saveHistory('insertHyperlink', '插入超链接');

    const nodeElement = document.querySelector(`[data-node-id="${activeNodeId}"] .node-content`);

    // 有选中文字的情况
    if (popoverState.hasSelectedText && popoverState.selectedText) {
      const highlightSpan = nodeElement?.querySelector('.hyperlink-selection-highlight');

      if (highlightSpan) {
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';
        linkElement.textContent = highlightSpan.textContent || text;
        highlightSpan.parentNode?.replaceChild(linkElement, highlightSpan);

        // 清除其他高亮
        nodeElement?.querySelectorAll('.hyperlink-selection-highlight').forEach(span => {
          const textNode = document.createTextNode(span.textContent || '');
          span.parentNode?.replaceChild(textNode, span);
        });
      } else if (selectionRangeRef.current) {
        // 降级方案：使用保存的 Range
        const range = selectionRangeRef.current;
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';
        linkElement.textContent = text;
        range.deleteContents();
        range.insertNode(linkElement);
      }

      if (nodeElement) {
        if (!node.richContent) {
          node.richContent = { html: '', text: '', json: {} };
        }
        node.richContent.html = nodeElement.innerHTML;
        node.richContent.text = nodeElement.textContent || '';
        node.text = nodeElement.textContent || '';
      }
    } else {
      // 没有选中文字，追加到末尾
      if (nodeElement) {
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';
        linkElement.textContent = text;

        nodeElement.appendChild(document.createTextNode(' '));
        nodeElement.appendChild(linkElement);

        if (!node.richContent) {
          node.richContent = { html: '', text: '', json: {} };
        }
        node.richContent.html = nodeElement.innerHTML;
        node.richContent.text = nodeElement.textContent || '';
        node.text = nodeElement.textContent || '';

        // 设置样式
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const contentEl = document.querySelector(`[data-node-id="${activeNodeId}"] .node-content`) as HTMLElement;
            const wrapperEl = document.querySelector(`[data-node-id="${activeNodeId}"]`) as HTMLElement;
            if (contentEl && wrapperEl) {
              contentEl.style.textAlign = 'left';
              contentEl.style.whiteSpace = 'nowrap';
              wrapperEl.style.justifyContent = 'flex-start';
              const scrollWidth = contentEl.scrollWidth;
              const padding = 12;
              const newWidth = scrollWidth + padding * 2;
              wrapperEl.style.width = `${newWidth}px`;
            }
          });
        });
      }
    }

    selectionRangeRef.current = null;
    mindMapRef.current.relayout();
  }, [mindMapRef, activeNodeId, popoverState]);

  /**
   * 确认超链接（插入或编辑）
   */
  const confirmHyperlink = useCallback((text: string, url: string) => {
    if (popoverState.mode === 'edit') {
      updateNodeHyperlink(text, url);
    } else {
      insertNewHyperlink(text, url);
    }

    setTimeout(() => {
      if (mindMapRef.current) {
        const stateManager = mindMapRef.current.getStateManager();
        const currentState = stateManager.getViewState();
        stateManager.setViewState({
          scale: currentState.scale,
          translateX: currentState.translateX,
          translateY: currentState.translateY,
        });
      }
    }, 100);
  }, [mindMapRef, popoverState.mode, updateNodeHyperlink, insertNewHyperlink]);

  /**
   * 处理链接悬停事件
   */
  useEffect(() => {
    const handleLinkMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.closest('.node-content')) {
        const linkElement = target as HTMLAnchorElement;
        const href = linkElement.getAttribute('href') || '';
        const text = linkElement.textContent || '';
        const nodeElement = linkElement.closest('[data-node-id]');
        const nodeId = nodeElement?.getAttribute('data-node-id') || null;

        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
        }

        hoverTimerRef.current = setTimeout(() => {
          const rect = linkElement.getBoundingClientRect();
          setPreviewState({
            visible: true,
            url: href,
            text,
            position: { x: rect.left, y: rect.bottom + 6 },
            nodeId,
            element: linkElement,
          });
        }, 800);
      }
    };

    const handleLinkMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.closest('.node-content')) {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }

        setTimeout(() => {
          if (!isHoveringPreviewRef.current) {
            setPreviewState(prev => ({ ...prev, visible: false }));
          }
        }, 100);
      }
    };

    document.addEventListener('mouseenter', handleLinkMouseEnter, true);
    document.addEventListener('mouseleave', handleLinkMouseLeave, true);

    return () => {
      document.removeEventListener('mouseenter', handleLinkMouseEnter, true);
      document.removeEventListener('mouseleave', handleLinkMouseLeave, true);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  return {
    popoverState,
    previewState,
    isHoveringPreviewRef,

    openInsertPopover,
    openEditPopover,
    closePopover,
    closePreview,
    confirmHyperlink,
    deleteHyperlink,
  };
};
