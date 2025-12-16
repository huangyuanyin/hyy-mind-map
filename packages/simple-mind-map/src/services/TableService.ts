import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { TableData, TableCell, TableOperationType } from '../types';

/**
 * 表格操作服务
 */
export class TableService {
  /**
   * 在指定位置插入行
   * @param table 表格数据
   * @param index 行索引
   * @param position 插入位置（before: 在上方, after: 在下方）
   * @returns 新的表格数据
   */
  public insertRow(table: TableData, index: number, position: 'before' | 'after'): TableData {
    const newTable = JSON.parse(JSON.stringify(table)) as TableData;
    const colCount = table.rows[0]?.length || 3;
    const newRow: TableCell[] = Array(colCount)
      .fill(null)
      .map(() => ({ content: '' }));

    const insertIndex = position === 'before' ? index : index + 1;
    newTable.rows.splice(insertIndex, 0, newRow);

    return newTable;
  }

  /**
   * 删除指定行
   * @param table 表格数据
   * @param index 行索引
   * @returns 新的表格数据，如果无法删除（只剩1行）则返回null
   */
  public deleteRow(table: TableData, index: number): TableData | null {
    if (table.rows.length <= 1) {
      return null; // 不允许删除最后一行
    }

    const newTable = JSON.parse(JSON.stringify(table)) as TableData;
    newTable.rows.splice(index, 1);
    return newTable;
  }

  /**
   * 在指定位置插入列
   * @param table 表格数据
   * @param index 列索引
   * @param position 插入位置（before: 在左侧, after: 在右侧）
   * @returns 新的表格数据
   */
  public insertColumn(
    table: TableData,
    index: number,
    position: 'before' | 'after'
  ): TableData {
    const newTable = JSON.parse(JSON.stringify(table)) as TableData;
    const insertIndex = position === 'before' ? index : index + 1;

    newTable.rows.forEach((row) => {
      row.splice(insertIndex, 0, { content: '' });
    });

    return newTable;
  }

  /**
   * 删除指定列
   * @param table 表格数据
   * @param index 列索引
   * @returns 新的表格数据，如果无法删除（只剩1列）则返回null
   */
  public deleteColumn(table: TableData, index: number): TableData | null {
    const colCount = table.rows[0]?.length || 0;
    if (colCount <= 1) {
      return null; // 不允许删除最后一列
    }

    const newTable = JSON.parse(JSON.stringify(table)) as TableData;
    newTable.rows.forEach((row) => {
      row.splice(index, 1);
    });

    return newTable;
  }

  /**
   * 执行表格操作
   * @param node 节点对象
   * @param operation 操作类型
   * @param index 行或列索引
   * @returns 新的表格数据，如果操作失败则返回null
   */
  public executeOperation(
    node: HyyMindMapNode,
    operation: TableOperationType,
    index: number
  ): TableData | null {
    const table = node.config?.attachment?.table;
    if (!table) return null;

    switch (operation) {
      case 'insertRowBefore':
        return this.insertRow(table, index, 'before');
      case 'insertRowAfter':
        return this.insertRow(table, index, 'after');
      case 'deleteRow':
        return this.deleteRow(table, index);
      case 'insertColumnBefore':
        return this.insertColumn(table, index, 'before');
      case 'insertColumnAfter':
        return this.insertColumn(table, index, 'after');
      case 'deleteColumn':
        return this.deleteColumn(table, index);
      default:
        return null;
    }
  }
}
