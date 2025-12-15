import { useState, useCallback, useEffect } from 'react';
import type { MindMap } from 'hyy-mind-map';

/**
 * 右键菜单类型
 */
export type ContextMenuType = 'canvas' | 'node';

/**
 * 右键菜单状态
 */
export interface ContextMenuState {
  /** 是否可见 */
  visible: boolean;
  /** 位置 */
  position: { x: number; y: number };
  /** 菜单类型 */
  type: ContextMenuType;
  /** 是否可以粘贴 */
  canPaste: boolean;
  /** 是否是根节点 */
  isRootNode: boolean;
}

/**
 * useContextMenu hook 返回值
 */
export interface UseContextMenuReturn {
  /** 菜单状态 */
  menuState: ContextMenuState;
  /** 打开菜单 */
  openMenu: (e: React.MouseEvent) => void;
  /** 关闭菜单 */
  closeMenu: () => void;
  /** 回到根节点 */
  handleCenterOnRoot: () => void;
  /** 展开所有节点 */
  handleExpandAll: () => void;
  /** 折叠所有节点 */
  handleCollapseAll: () => void;
  /** 插入子节点 */
  handleInsertChild: () => void;
  /** 插入同级节点 */
  handleInsertSibling: () => void;
  /** 插入父节点 */
  handleInsertParent: () => void;
  /** 删除节点 */
  handleDeleteNode: () => void;
  /** 复制节点 */
  handleCopyNode: () => void;
  /** 粘贴节点 */
  handlePasteNode: () => void;
}

/**
 * useContextMenu - 管理右键菜单状态和操作
 */
export function useContextMenu(
  mindMapRef: React.MutableRefObject<MindMap | null>
): UseContextMenuReturn {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    visible: false,
    position: { x: 0, y: 0 },
    type: 'canvas',
    canPaste: false,
    isRootNode: false,
  });

  // 打开菜单
  const openMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    if (!mindMapRef.current) return;

    const state = mindMapRef.current.getStateManager().getState();
    const selectedNode = state.selection.activeNode;
    const hasSelectedNodes = state.selection.selectedNodes.size > 0;

    let menuType: ContextMenuType = 'canvas';
    let isRoot = false;
    let canPaste = false;

    if (selectedNode || hasSelectedNodes) {
      menuType = 'node';
      isRoot = selectedNode?.parent === null || selectedNode?.parent === undefined;

      // 检查剪贴板
      const shortcutManager = mindMapRef.current.getShortcutManager();
      const clipboard = shortcutManager.getClipboard();
      canPaste = clipboard && (clipboard.type === 'node' || clipboard.type === 'nodes');
    }

    setMenuState({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      type: menuType,
      canPaste,
      isRootNode: isRoot,
    });
  }, [mindMapRef]);

  // 关闭菜单
  const closeMenu = useCallback(() => {
    setMenuState(prev => ({ ...prev, visible: false }));
  }, []);

  // 点击外部关闭菜单
  useEffect(() => {
    if (menuState.visible) {
      const handleClickOutside = () => closeMenu();
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuState.visible, closeMenu]);

  // 回到根节点
  const handleCenterOnRoot = useCallback(() => {
    mindMapRef.current?.viewService.centerOnRoot();
    closeMenu();
  }, [mindMapRef, closeMenu]);

  // 展开所有节点
  const handleExpandAll = useCallback(() => {
    if (!mindMapRef.current) return;
    const root = mindMapRef.current.getRoot();
    if (root) {
      const expandRecursive = (node: any) => {
        node.expanded = true;
        node.children?.forEach(expandRecursive);
      };
      expandRecursive(root);
      mindMapRef.current.relayout();
    }
    closeMenu();
  }, [mindMapRef, closeMenu]);

  // 折叠所有节点
  const handleCollapseAll = useCallback(() => {
    if (!mindMapRef.current) return;
    const root = mindMapRef.current.getRoot();
    if (root?.children) {
      root.children.forEach((child: any) => {
        const collapseRecursive = (node: any) => {
          node.expanded = false;
          node.children?.forEach(collapseRecursive);
        };
        collapseRecursive(child);
      });
      mindMapRef.current.relayout();
    }
    closeMenu();
  }, [mindMapRef, closeMenu]);

  // 插入子节点
  const handleInsertChild = useCallback(() => {
    if (!mindMapRef.current) return;
    const state = mindMapRef.current.getStateManager().getState();
    const selectedNode = state.selection.activeNode;
    if (selectedNode) {
      mindMapRef.current.nodeService.addNode(selectedNode.id, '新子节点');
      mindMapRef.current.relayout();
    }
    closeMenu();
  }, [mindMapRef, closeMenu]);

  // 插入同级节点
  const handleInsertSibling = useCallback(() => {
    if (menuState.isRootNode || !mindMapRef.current) return;
    const state = mindMapRef.current.getStateManager().getState();
    const selectedNode = state.selection.activeNode;
    if (selectedNode?.parent) {
      mindMapRef.current.nodeService.insertSiblingNode(selectedNode.id, '新同级节点');
      mindMapRef.current.relayout();
    }
    closeMenu();
  }, [mindMapRef, menuState.isRootNode, closeMenu]);

  // 插入父节点
  const handleInsertParent = useCallback(() => {
    if (menuState.isRootNode || !mindMapRef.current) return;
    const state = mindMapRef.current.getStateManager().getState();
    const selectedNode = state.selection.activeNode;
    if (selectedNode?.parent) {
      mindMapRef.current.nodeService.insertParentNode(selectedNode.id, '新父节点');
      mindMapRef.current.relayout();
    }
    closeMenu();
  }, [mindMapRef, menuState.isRootNode, closeMenu]);

  // 删除节点
  const handleDeleteNode = useCallback(() => {
    if (menuState.isRootNode || !mindMapRef.current) return;
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
    console.log(`已删除 ${count} 个节点`);
    closeMenu();
  }, [mindMapRef, menuState.isRootNode, closeMenu]);

  // 复制节点
  const handleCopyNode = useCallback(() => {
    if (!mindMapRef.current) return;
    const state = mindMapRef.current.getStateManager().getState();
    const selectedNodes = Array.from(state.selection.selectedNodes);
    const copiedData = selectedNodes.map(node => node.toData());

    const shortcutManager = mindMapRef.current.getShortcutManager();
    shortcutManager.setClipboard({
      type: 'nodes',
      data: copiedData,
    });

    console.log(`已复制 ${copiedData.length} 个节点到剪贴板`);
    closeMenu();
  }, [mindMapRef, closeMenu]);

  // 粘贴节点
  const handlePasteNode = useCallback(() => {
    if (!menuState.canPaste || !mindMapRef.current) return;

    const state = mindMapRef.current.getStateManager().getState();
    const selectedNode = state.selection.activeNode;
    if (!selectedNode) return;

    const shortcutManager = mindMapRef.current.getShortcutManager();
    const clipboard = shortcutManager.getClipboard();

    if (!clipboard || (clipboard.type !== 'node' && clipboard.type !== 'nodes')) {
      alert('剪贴板中没有节点数据');
      closeMenu();
      return;
    }

    const nodesToPaste = clipboard.type === 'nodes' ? clipboard.data : [clipboard.data];

    nodesToPaste.forEach((nodeData: any) => {
      mindMapRef.current!.nodeService.pasteNodeData(selectedNode.id, nodeData);
    });

    if (nodesToPaste.length > 0) {
      mindMapRef.current.relayout();
    }
    console.log(`已粘贴 ${nodesToPaste.length} 个节点`);
    closeMenu();
  }, [mindMapRef, menuState.canPaste, closeMenu]);

  return {
    menuState,
    openMenu,
    closeMenu,
    handleCenterOnRoot,
    handleExpandAll,
    handleCollapseAll,
    handleInsertChild,
    handleInsertSibling,
    handleInsertParent,
    handleDeleteNode,
    handleCopyNode,
    handlePasteNode,
  };
}
