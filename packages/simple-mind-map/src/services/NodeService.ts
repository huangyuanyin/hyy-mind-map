/**
 * NodeService - 节点操作服务
 *
 * 职责：
 * 1. 封装所有节点操作的业务逻辑
 * 2. 协调 NodeManager、LayoutEngine、HistoryManager
 * 3. 确保操作的事务性（验证 -> 执行 -> 保存历史 -> 触发布局）
 */

import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { NodeManager } from '../core/NodeManager';
import type { LayoutEngine } from '../layout/LayoutEngine';
import type { HistoryManager } from '../history/HistoryManager';
import type { NodeData, DropPosition } from '../types';
import { NodeValidator } from '../validators';

export interface NodeOperationResult {
  success: boolean;
  node?: HyyMindMapNode;
  error?: string;
}

export class NodeService {
  constructor(
    private nodeManager: NodeManager,
    _layoutEngine: LayoutEngine,
    private historyManager: HistoryManager
  ) {}

  /**
   * 添加节点（带验证和历史记录）
   */
  addNode(parentId: string, text: string): NodeOperationResult {
    // 1. 查找父节点
    const parent = this.nodeManager.findNode(parentId);
    if (!parent) {
      return {
        success: false,
        error: `Parent node not found: ${parentId}`,
      };
    }

    // 2. 验证是否可以添加
    const validation = NodeValidator.validateAddChild(parent);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // 3. 保存历史
    this.saveHistory('addNode', `添加节点: ${text}`);

    // 4. 执行添加
    const newNode = this.nodeManager.addNode(parentId, {
      id: this.generateNodeId(),
      text,
    });

    if (!newNode) {
      return {
        success: false,
        error: 'Failed to add node',
      };
    }

    // 5. 返回成功（布局由外部统一触发）
    return {
      success: true,
      node: newNode,
    };
  }

  /**
   * 删除节点
   */
  removeNode(id: string): NodeOperationResult {
    // 1. 查找节点
    const node = this.nodeManager.findNode(id);
    if (!node) {
      return {
        success: false,
        error: `Node not found: ${id}`,
      };
    }

    // 2. 验证是否可以删除
    const validation = NodeValidator.validateRemoveNode(node);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // 3. 保存历史
    this.saveHistory('removeNode', `删除节点: ${node.text || id}`);

    // 4. 执行删除
    const success = this.nodeManager.removeNode(id);

    return {
      success,
      error: success ? undefined : 'Failed to remove node',
    };
  }

  /**
   * 更新节点文本
   */
  updateNodeText(id: string, text: string): NodeOperationResult {
    // 1. 验证文本
    const textValidation = NodeValidator.validateNodeText(text);
    if (!textValidation.valid) {
      return {
        success: false,
        error: textValidation.error,
      };
    }

    // 2. 查找节点
    const node = this.nodeManager.findNode(id);
    if (!node) {
      return {
        success: false,
        error: `Node not found: ${id}`,
      };
    }

    // 3. 检查是否真的变化
    if (node.text === text) {
      return { success: true, node };
    }

    // 4. 保存历史
    this.saveHistory('updateNode', `更新节点文本`);

    // 5. 执行更新
    const success = this.nodeManager.updateNode(id, text);

    return {
      success,
      node: success ? node : undefined,
      error: success ? undefined : 'Failed to update node',
    };
  }

  /**
   * 移动节点
   */
  moveNode(
    nodeId: string,
    targetId: string,
    position: DropPosition
  ): NodeOperationResult {
    // 1. 查找节点
    const node = this.nodeManager.findNode(nodeId);
    const target = this.nodeManager.findNode(targetId);

    if (!node || !target) {
      return {
        success: false,
        error: 'Node or target not found',
      };
    }

    // 2. 验证移动操作
    if (position === 'inside') {
      const validation = NodeValidator.validateMoveNode(node, target);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }
    }

    // 3. 保存历史
    this.saveHistory('moveNode', `移动节点: ${node.text}`);

    // 4. 执行移动
    const success = this.performMove(node, target, position);

    return {
      success,
      error: success ? undefined : 'Failed to move node',
    };
  }

  /**
   * 插入同级节点
   */
  insertSiblingNode(nodeId: string, text: string): NodeOperationResult {
    const node = this.nodeManager.findNode(nodeId);
    if (!node?.parent) {
      return {
        success: false,
        error: 'Cannot insert sibling for root node',
      };
    }

    this.saveHistory('insertSiblingNode', `插入同级节点: ${text}`);

    const parent = node.parent;
    const siblingIndex = parent.children.indexOf(node);

    const newNode = parent.addChild({
      id: this.generateNodeId(),
      text,
    });

    // 调整位置
    parent.children.splice(parent.children.length - 1, 1);
    parent.children.splice(siblingIndex + 1, 0, newNode);

    this.nodeManager.refreshNodeMap();

    return {
      success: true,
      node: newNode,
    };
  }

  /**
   * 插入父节点
   */
  insertParentNode(nodeId: string, text: string): NodeOperationResult {
    const node = this.nodeManager.findNode(nodeId);
    if (!node?.parent) {
      return {
        success: false,
        error: 'Cannot insert parent for root node',
      };
    }

    this.saveHistory('insertParentNode', `插入父节点: ${text}`);

    const originalParent = node.parent;
    const nodeIndex = originalParent.children.indexOf(node);

    const newParent = originalParent.addChild({
      id: this.generateNodeId(),
      text,
    });

    // 重建节点关系
    originalParent.children.splice(originalParent.children.length - 1, 1);
    originalParent.children.splice(nodeIndex, 1);
    originalParent.children.splice(nodeIndex, 0, newParent);
    node.parent = newParent;
    newParent.children.push(node);

    this.nodeManager.refreshNodeMap();

    return {
      success: true,
      node: newParent,
    };
  }

  /**
   * 粘贴节点数据（包含子树）
   */
  pasteNodeData(parentId: string, nodeData: NodeData): NodeOperationResult {
    const parent = this.nodeManager.findNode(parentId);
    if (!parent) {
      return {
        success: false,
        error: `Parent node not found: ${parentId}`,
      };
    }

    this.saveHistory('pasteNode', `粘贴节点: ${nodeData.text}`);

    // 递归添加节点
    const addedNode = this.addNodeRecursive(parent, nodeData);

    return {
      success: !!addedNode,
      node: addedNode || undefined,
      error: addedNode ? undefined : 'Failed to paste node',
    };
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 生成唯一节点 ID
   */
  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存历史记录
   */
  private saveHistory(operationType: string, description: string): void {
    const root = this.nodeManager.getRoot();
    if (root) {
      const currentData = root.toData();
      this.historyManager.saveState(operationType, description, currentData);
    }
  }

  /**
   * 执行节点移动
   */
  private performMove(
    node: HyyMindMapNode,
    targetNode: HyyMindMapNode,
    position: DropPosition
  ): boolean {
    // 从原父节点中移除
    const originalParent = node.parent;
    if (!originalParent) return false;

    const originalIndex = originalParent.children.indexOf(node);
    if (originalIndex === -1) return false;

    originalParent.children.splice(originalIndex, 1);

    // 根据放置位置处理
    if (position === 'inside') {
      node.parent = targetNode;
      targetNode.children.push(node);
    } else {
      const newParent = targetNode.parent;
      if (!newParent) {
        // 恢复原位置
        originalParent.children.splice(originalIndex, 0, node);
        return false;
      }

      node.parent = newParent;
      const targetIndex = newParent.children.indexOf(targetNode);
      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
      newParent.children.splice(insertIndex, 0, node);
    }

    this.nodeManager.refreshNodeMap();
    return true;
  }

  /**
   * 递归添加节点
   */
  private addNodeRecursive(
    parent: HyyMindMapNode,
    data: NodeData
  ): HyyMindMapNode | null {
    const newNode = this.nodeManager.addNode(parent.id, {
      id: this.generateNodeId(),
      text: data.text,
      config: data.config,
      richContent: data.richContent,
    });

    if (newNode && data.children && data.children.length > 0) {
      for (const childData of data.children) {
        this.addNodeRecursive(newNode, childData);
      }
    }

    return newNode;
  }
}
