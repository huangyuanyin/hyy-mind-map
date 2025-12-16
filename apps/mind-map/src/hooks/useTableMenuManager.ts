import { useState, useEffect, useCallback, useRef } from 'react';
import type { MindMap, EventData } from 'hyy-mind-map';
import type { TableMenuType, MenuPosition } from '../components/TableMenu';

/**
 * 表格菜单状态
 */
export interface TableMenuState {
  /** 是否可见 */
  visible: boolean;
  /** 节点ID */
  nodeId: string | null;
  /** 类型：行或列 */
  type: TableMenuType | null;
  /** 行或列索引 */
  index: number;
  /** 菜单位置 */
  position: MenuPosition;
  /** 是否可以删除（至少保留1行/列） */
  canDelete: boolean;
}

/**
 * 表格菜单管理 hook
 */
export function useTableMenuManager(
  mindMapRef: React.MutableRefObject<MindMap | null>
) {
  const [menuState, setMenuState] = useState<TableMenuState>({
    visible: false,
    nodeId: null,
    type: null,
    index: 0,
    position: { x: 0, y: 0 },
    canDelete: true,
  });

  const isHoveringMenuRef = useRef(false);

  useEffect(() => {
    if (!mindMapRef.current) return;

    const handleTableMenuTrigger = (data: EventData) => {
      const { nodeId, type, index, rect } = data;
      if (!nodeId || !type || index === undefined || !rect) return;

      const node = mindMapRef.current?.getNodeManager().findNode(nodeId);
      if (!node?.config?.attachment?.table) return;

      const table = node.config.attachment.table;
      const canDelete =
        type === 'row' ? table.rows.length > 1 : table.rows[0].length > 1;

      setMenuState({
        visible: true,
        nodeId,
        type,
        index,
        position: {
          x: type === 'row' ? rect.right + 5 : rect.left,
          y: type === 'row' ? rect.top : rect.bottom + 5,
        },
        canDelete,
      });
    };

    const eventSystem = mindMapRef.current.getEventSystem();
    eventSystem.on('tableMenuTrigger', handleTableMenuTrigger);

    return () => {
      eventSystem.off('tableMenuTrigger', handleTableMenuTrigger);
    };
  }, [mindMapRef]);

  const closeMenu = useCallback((forceClose = false) => {
    if (forceClose) {
      setMenuState((prev) => ({ ...prev, visible: false }));
      // 清除表格高亮
      if (mindMapRef.current?.richText) {
        mindMapRef.current.richText.clearTableHighlight();
      }
    }
  }, [mindMapRef]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!menuState.visible) return;
      
      // 检查点击是否在菜单内部
      const target = e.target as HTMLElement;
      const isClickOnMenu = target.closest('.table-row-menu') || target.closest('.table-column-menu');
      const isClickOnTriggerBtn = target.closest('.table-row-trigger-btn') || target.closest('.table-col-trigger-btn');
      
      // 如果点击在菜单或触发按钮外部，关闭菜单
      if (!isClickOnMenu && !isClickOnTriggerBtn) {
        closeMenu(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuState.visible, closeMenu]);

  return {
    menuState,
    closeMenu,
    isHoveringMenuRef,
  };
}
