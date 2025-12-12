import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { NodeData } from '../types';
import { TreeUtils } from '../utils/TreeUtils';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class NodeValidator {
  /**
   * 验证节点ID是否有效
   */
  static validateNodeId(id: string): ValidationResult {
    if (!id || typeof id !== 'string') {
      return {
        valid: false,
        error: 'Node ID must be a non-empty string',
      };
    }

    if (id.trim().length === 0) {
      return {
        valid: false,
        error: 'Node ID cannot be empty or whitespace',
      };
    }

    return { valid: true };
  }

  /**
   * 验证节点文本
   */
  static validateNodeText(text: string): ValidationResult {
    if (typeof text !== 'string') {
      return {
        valid: false,
        error: 'Node text must be a string',
      };
    }

    // 允许空文本，但不允许 null/undefined
    return { valid: true };
  }

  /**
   * 验证节点数据
   */
  static validateNodeData(data: NodeData): ValidationResult {
    // 验证 ID
    const idValidation = this.validateNodeId(data.id);
    if (!idValidation.valid) {
      return idValidation;
    }

    // 验证文本
    const textValidation = this.validateNodeText(data.text);
    if (!textValidation.valid) {
      return textValidation;
    }

    return { valid: true };
  }

  /**
   * 验证是否可以添加子节点
   */
  static validateAddChild(
    parent: HyyMindMapNode,
    maxChildren: number = 1000
  ): ValidationResult {
    if (parent.children.length >= maxChildren) {
      return {
        valid: false,
        error: `Cannot add more than ${maxChildren} children to a node`,
      };
    }

    return { valid: true };
  }

  /**
   * 验证是否可以删除节点
   */
  static validateRemoveNode(node: HyyMindMapNode): ValidationResult {
    // 不能删除根节点
    if (node.parent === null) {
      return {
        valid: false,
        error: 'Cannot remove root node',
      };
    }

    return { valid: true };
  }

  /**
   * 验证节点移动操作
   */
  static validateMoveNode(
    node: HyyMindMapNode,
    newParent: HyyMindMapNode
  ): ValidationResult {
    // 不能移动根节点
    if (node.parent === null) {
      return {
        valid: false,
        error: 'Cannot move root node',
      };
    }

    // 不能移动到自己
    if (node === newParent) {
      return {
        valid: false,
        error: 'Cannot move node to itself',
      };
    }

    // 不能移动到自己的后代节点
    if (TreeUtils.isDescendant(newParent, node)) {
      return {
        valid: false,
        error: 'Cannot move node to its descendant',
      };
    }

    return { valid: true };
  }

  /**
   * 验证节点树的完整性
   */
  static validateTree(root: HyyMindMapNode): ValidationResult {
    const ids = new Set<string>();
    let error: string | undefined;

    TreeUtils.traverse(root, (node) => {
      // 检查 ID 唯一性
      if (ids.has(node.id)) {
        error = `Duplicate node ID found: ${node.id}`;
        return false; // 停止遍历
      }
      ids.add(node.id);

      // 检查父子关系一致性
      for (const child of node.children) {
        if (child.parent !== node) {
          error = `Inconsistent parent-child relationship for node ${child.id}`;
          return false;
        }
      }
    });

    if (error) {
      return { valid: false, error };
    }

    return { valid: true };
  }

  /**
   * 验证节点深度（防止过深的树）
   */
  static validateDepth(
    node: HyyMindMapNode,
    maxDepth: number = 20
  ): ValidationResult {
    const depth = TreeUtils.getDepth(node);

    if (depth >= maxDepth) {
      return {
        valid: false,
        error: `Node depth (${depth}) exceeds maximum allowed depth (${maxDepth})`,
      };
    }

    return { valid: true };
  }
}
