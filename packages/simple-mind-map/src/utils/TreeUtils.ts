import { HyyMindMapNode } from '../core/HyyMindMapNode';

export class TreeUtils {
  /**
   * 深度优先遍历
   */
  static traverse(
    node: HyyMindMapNode,
    callback: (node: HyyMindMapNode, level: number) => void | boolean,
    level: number = 0
  ): void {
    // 如果回调返回 false，停止遍历这个分支
    const shouldContinue = callback(node, level);
    if (shouldContinue === false) {
      return;
    }

    for (const child of node.children) {
      this.traverse(child, callback, level + 1);
    }
  }

  /**
   * 广度优先遍历
   */
  static traverseBFS(
    root: HyyMindMapNode,
    callback: (node: HyyMindMapNode, level: number) => void | boolean
  ): void {
    const queue: Array<{ node: HyyMindMapNode; level: number }> = [
      { node: root, level: 0 },
    ];

    while (queue.length > 0) {
      const { node, level } = queue.shift()!;

      const shouldContinue = callback(node, level);
      if (shouldContinue === false) {
        continue;
      }

      for (const child of node.children) {
        queue.push({ node: child, level: level + 1 });
      }
    }
  }

  /**
   * 收集所有节点到数组（扁平化）
   */
  static collectAll(root: HyyMindMapNode): HyyMindMapNode[] {
    const result: HyyMindMapNode[] = [];
    this.traverse(root, (node) => {
      result.push(node);
    });
    return result;
  }

  /**
   * 查找节点的所有祖先节点
   */
  static getAncestors(node: HyyMindMapNode): HyyMindMapNode[] {
    const ancestors: HyyMindMapNode[] = [];
    let current = node.parent;

    while (current) {
      ancestors.push(current);
      current = current.parent;
    }

    return ancestors;
  }

  /**
   * 获取节点路径（从根到当前节点）
   */
  static getPath(node: HyyMindMapNode): HyyMindMapNode[] {
    const ancestors = this.getAncestors(node);
    return [...ancestors.reverse(), node];
  }

  /**
   * 判断节点A是否是节点B的祖先
   */
  static isAncestor(
    ancestor: HyyMindMapNode,
    descendant: HyyMindMapNode
  ): boolean {
    let current = descendant.parent;
    while (current) {
      if (current === ancestor) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * 判断节点A是否是节点B的后代
   */
  static isDescendant(
    descendant: HyyMindMapNode,
    ancestor: HyyMindMapNode
  ): boolean {
    return this.isAncestor(ancestor, descendant);
  }

  /**
   * 获取节点的深度（从根节点开始计数，根节点深度为0）
   */
  static getDepth(node: HyyMindMapNode): number {
    let depth = 0;
    let current = node.parent;

    while (current) {
      depth++;
      current = current.parent;
    }

    return depth;
  }

  /**
   * 获取树的最大深度
   */
  static getMaxDepth(root: HyyMindMapNode): number {
    let maxDepth = 0;

    this.traverse(root, (_node, level) => {
      maxDepth = Math.max(maxDepth, level);
    });

    return maxDepth;
  }

  /**
   * 获取节点的同级节点
   */
  static getSiblings(node: HyyMindMapNode): HyyMindMapNode[] {
    if (!node.parent) {
      return [];
    }

    return node.parent.children.filter((child) => child !== node);
  }

  /**
   * 获取节点在父节点中的索引
   */
  static getIndexInParent(node: HyyMindMapNode): number {
    if (!node.parent) {
      return -1;
    }

    return node.parent.children.indexOf(node);
  }

  /**
   * 计算子树的总节点数
   */
  static getSubtreeNodeCount(node: HyyMindMapNode): number {
    let count = 1; // 包含当前节点

    this.traverse(node, (n) => {
      if (n !== node) {
        count++;
      }
    });

    return count;
  }

  /**
   * 查找最近的共同祖先
   */
  static findCommonAncestor(
    node1: HyyMindMapNode,
    node2: HyyMindMapNode
  ): HyyMindMapNode | null {
    const ancestors1 = new Set(this.getAncestors(node1));

    let current = node2.parent;
    while (current) {
      if (ancestors1.has(current)) {
        return current;
      }
      current = current.parent;
    }

    return null;
  }

  /**
   * 克隆节点树（深拷贝）
   */
  static clone(node: HyyMindMapNode): HyyMindMapNode {
    const data = node.toData();
    return new HyyMindMapNode(data, undefined);
  }
}
