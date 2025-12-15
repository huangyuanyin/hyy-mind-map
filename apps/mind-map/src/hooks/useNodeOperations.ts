import { useCallback } from 'react';
import type { MindMap } from 'hyy-mind-map';
import type { NodeStyle } from './useMindMap';

/**
 * useNodeOperations hook 返回值
 */
export interface UseNodeOperationsReturn {
  /** 删除节点 */
  handleDelete: () => void;
  /** 添加子节点 */
  handleAddChild: () => void;
  /** 添加同级节点 */
  handleAddSibling: () => void;
  /** 删除选中的节点 */
  handleDeleteSelected: () => void;
  /** 复制选中的节点 */
  handleCopySelected: () => void;
  /** 节点样式变更 */
  handleStyleChange: (nodeId: string, style: NodeStyle) => void;
  /** 插入表格 */
  handleInsertTable: (nodeId: string) => void;
  /** 插入代码块 */
  handleInsertCodeBlock: (nodeId: string) => void;
  /** 图标选择 */
  handleIconSelect: (icons: Record<string, string>) => void;
}

/**
 * 管理节点操作逻辑
 */
export function useNodeOperations(
  mindMapRef: React.MutableRefObject<MindMap | null>,
  activeNodeId: string | null,
  hasSelectedNode: boolean,
  isRootNode: boolean,
  setNodeStyle: React.Dispatch<React.SetStateAction<NodeStyle>>
): UseNodeOperationsReturn {
  // 删除节点
  const handleDelete = useCallback(() => {
    if (!hasSelectedNode || isRootNode || !mindMapRef.current || !activeNodeId) return;
    const result = mindMapRef.current.nodeService.removeNode(activeNodeId);
    if (result.success) {
      mindMapRef.current.relayout();
    }
  }, [mindMapRef, activeNodeId, hasSelectedNode, isRootNode]);

  // 添加子节点
  const handleAddChild = useCallback(() => {
    if (!hasSelectedNode || !mindMapRef.current || !activeNodeId) return;
    mindMapRef.current.nodeService.addNode(activeNodeId, '新子节点');
    mindMapRef.current.relayout();
  }, [mindMapRef, activeNodeId, hasSelectedNode]);

  // 添加同级节点
  const handleAddSibling = useCallback(() => {
    if (!hasSelectedNode || isRootNode || !mindMapRef.current || !activeNodeId) return;
    mindMapRef.current.nodeService.insertSiblingNode(activeNodeId, '新同级节点');
    mindMapRef.current.relayout();
  }, [mindMapRef, activeNodeId, hasSelectedNode, isRootNode]);

  // 删除选中的节点
  const handleDeleteSelected = useCallback(() => {
    if (!mindMapRef.current) return;
    const state = mindMapRef.current.getStateManager().getState();
    const selectedNodes = Array.from(state.selection.selectedNodes);
    let count = 0;

    selectedNodes.forEach((node) => {
      const result = mindMapRef.current!.nodeService.removeNode(node.id);
      if (result.success) count++;
    });

    if (count > 0) {
      mindMapRef.current.relayout();
    }
  }, [mindMapRef]);

  // 复制选中的节点
  const handleCopySelected = useCallback(() => {
    if (!mindMapRef.current) return;
    const state = mindMapRef.current.getStateManager().getState();
    const selectedNodes = Array.from(state.selection.selectedNodes);
    const copiedData = selectedNodes.map(node => node.toData());

    const shortcutManager = mindMapRef.current.getShortcutManager();
    shortcutManager.setClipboard({
      type: 'nodes',
      data: copiedData,
    });

    alert(`已复制 ${copiedData.length} 个节点到剪贴板`);
  }, [mindMapRef]);

  // 节点样式变更
  const handleStyleChange = useCallback((nodeId: string, style: NodeStyle) => {
    if (!mindMapRef.current) return;

    const node = mindMapRef.current.getNodeManager().findNode(nodeId);
    if (node) {
      mindMapRef.current.saveHistory('updateNodeStyle', '修改节点样式');

      if (!node.config) {
        node.config = {};
      }
      Object.assign(node.config, style);
      mindMapRef.current.relayout();
      setNodeStyle(prev => ({ ...prev, ...style }));
    }
  }, [mindMapRef, setNodeStyle]);

  // 插入表格
  const handleInsertTable = useCallback((nodeId: string) => {
    if (!mindMapRef.current) return;

    const node = mindMapRef.current.getNodeManager().findNode(nodeId);
    if (node) {
      mindMapRef.current.saveHistory('insertTable', '插入表格');

      if (!node.config) {
        node.config = {};
      }

      node.config.attachment = {
        type: 'table',
        table: {
          rows: [
            [{ content: '', isHeader: true }, { content: '', isHeader: true }, { content: '', isHeader: true }],
            [{ content: '' }, { content: '' }, { content: '' }],
          ]
        }
      };

      mindMapRef.current.relayout();
    }
  }, [mindMapRef]);

  // 插入代码块
  const handleInsertCodeBlock = useCallback((nodeId: string) => {
    if (!mindMapRef.current) return;

    const node = mindMapRef.current.getNodeManager().findNode(nodeId);
    if (!node) return;

    const nodeText = node.text || node.richContent?.text || '';
    if (!nodeText.trim()) return;

    mindMapRef.current.saveHistory('insertCodeBlock', '插入代码块');

    if (!node.config) {
      node.config = {};
    }

    node.config.attachment = {
      type: 'code',
      codeBlock: {
        code: nodeText,
        language: 'javascript'
      }
    };

    mindMapRef.current.relayout();
  }, [mindMapRef]);

  // 图标选择
  const handleIconSelect = useCallback((icons: Record<string, string>) => {
    if (!mindMapRef.current || !activeNodeId) return;

    const node = mindMapRef.current.getNodeManager().findNode(activeNodeId);
    if (node) {
      mindMapRef.current.saveHistory('updateNodeIcons', '修改节点图标');

      if (!node.config) {
        node.config = {};
      }
      node.config.icons = icons;
      mindMapRef.current.relayout();
    }
  }, [mindMapRef, activeNodeId]);

  return {
    handleDelete,
    handleAddChild,
    handleAddSibling,
    handleDeleteSelected,
    handleCopySelected,
    handleStyleChange,
    handleInsertTable,
    handleInsertCodeBlock,
    handleIconSelect,
  };
}
