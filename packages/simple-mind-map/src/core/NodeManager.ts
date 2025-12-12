import { HyyMindMapNode } from './HyyMindMapNode';
import type { NodeData } from '../types';
import type { INodeManager } from '../types/interfaces';

/**
 * NodeManager - 节点管理器
 */
export class NodeManager implements INodeManager {
  private root: HyyMindMapNode | null = null;
  private nodeMap: Map<string, HyyMindMapNode> = new Map();

  /**
   * 设置根节点
   */
  public setRoot(data: NodeData): HyyMindMapNode {
    this.root = new HyyMindMapNode(data);
    this.refreshNodeMap();
    return this.root;
  }

  /**
   * 获取根节点
   */
  public getRoot(): HyyMindMapNode | null {
    return this.root;
  }

  /**
   * 获取所有节点
   */
  public getAllNodes(): HyyMindMapNode[] {
    if (!this.root) return [];

    const result: HyyMindMapNode[] = [];
    this.collectAllNodes(this.root, result);
    return result;
  }

  /**
   * 根据ID查找节点
   */
  public findNode(id: string): HyyMindMapNode | null {
    return this.nodeMap.get(id) ?? null;
  }

  /**
   * 添加节点
   */
  public addNode(parentId: string, data: NodeData): HyyMindMapNode | null {
    const parent = this.findNode(parentId);
    if (!parent) {
      console.warn(`Parent node not found: ${parentId}`);
      return null;
    }

    const newNode = parent.addChild(data);
    this.refreshNodeMap();
    return newNode;
  }

  /**
   * 删除节点
   */
  public removeNode(id: string): boolean {
    // 不能删除根节点
    if (this.root?.id === id) {
      console.warn('Cannot remove root node');
      return false;
    }

    const node = this.findNode(id);
    if (!node?.parent) {
      return false;
    }

    const success = node.parent.removeChild(id);
    if (success) {
      this.refreshNodeMap();
    }
    return success;
  }

  /**
   * 更新节点文本
   */
  public updateNode(id: string, text: string): boolean {
    const node = this.findNode(id);
    if (!node) {
      return false;
    }

    node.text = text;
    return true;
  }

  /**
   * 清空所有节点
   */
  public clear(): void {
    this.root = null;
    this.nodeMap.clear();
  }

  /**
   * 刷新节点映射表
   */
  public refreshNodeMap(): void {
    this.nodeMap.clear();
    for (const node of this.getAllNodes()) {
      this.nodeMap.set(node.id, node);
    }
  }

  /**
   * 收集所有节点到数组
   */
  private collectAllNodes(node: HyyMindMapNode, result: HyyMindMapNode[]): void {
    result.push(node);
    for (const child of node.children) {
      this.collectAllNodes(child, result);
    }
  }
}
