import { useCallback } from 'react';
import type { MindMap, TableOperationType } from 'hyy-mind-map';

/**
 * 表格操作 hook
 */
export function useTableOperations(
  mindMapRef: React.MutableRefObject<MindMap | null>
) {
  const executeTableOperation = useCallback(
    (nodeId: string, operation: TableOperationType, index: number) => {
      if (!mindMapRef.current) return;

      const node = mindMapRef.current.getNodeManager().findNode(nodeId);
      if (!node || !node.config?.attachment?.table) return;

      // 保存历史记录
      const operationNames: Record<TableOperationType, string> = {
        insertRowBefore: '在上方插入行',
        insertRowAfter: '在下方插入行',
        deleteRow: '删除行',
        insertColumnBefore: '在左侧插入列',
        insertColumnAfter: '在右侧插入列',
        deleteColumn: '删除列',
      };
      mindMapRef.current.saveHistory('tableOperation', operationNames[operation]);

      // 执行操作
      const newTable = mindMapRef.current.tableService.executeOperation(
        node,
        operation,
        index
      );

      if (newTable) {
        node.config.attachment.table = newTable;
        mindMapRef.current.relayout();

        // 操作完成后清除高亮
        if (mindMapRef.current.richText) {
          mindMapRef.current.richText.clearTableHighlight();
        }
      }
    },
    [mindMapRef]
  );

  return { executeTableOperation };
}
