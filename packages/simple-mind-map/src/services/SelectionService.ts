import type { StateManager } from '../core/StateManager';
import type { NodeManager } from '../core/NodeManager';
import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { Rect } from '../types';
import { GeometryUtils, TreeUtils } from '../utils';

export class SelectionService {
  constructor(
    private stateManager: StateManager,
    private nodeManager: NodeManager
  ) {}

  /**
   * 设置激活节点（单选）
   */
  setActiveNode(node: HyyMindMapNode | null): void {
    // 清除所有节点的激活状态
    const allNodes = this.nodeManager.getAllNodes();
    for (const n of allNodes) {
      n.isActive = false;
    }

    // 设置新的激活节点
    if (node) {
      node.isActive = true;
    }

    this.stateManager.setActiveNode(node);
  }

  /**
   * 获取激活节点
   */
  getActiveNode(): HyyMindMapNode | null {
    return this.stateManager.getSelectionState().activeNode;
  }

  /**
   * 设置 hover 节点
   */
  setHoverNode(node: HyyMindMapNode | null): void {
    const currentHover = this.stateManager.getSelectionState().hoverNode;

    // 清除之前的 hover 状态
    if (currentHover) {
      currentHover.isHover = false;
    }

    // 设置新的 hover 状态
    if (node) {
      node.isHover = true;
    }

    this.stateManager.setHoverNode(node);
  }

  /**
   * 切换节点选中状态（多选）
   */
  toggleNodeSelection(node: HyyMindMapNode): void {
    if (node.isSelected) {
      node.isSelected = false;
      this.stateManager.removeSelectedNode(node);
    } else {
      node.isSelected = true;
      this.stateManager.addSelectedNode(node);
    }
  }

  /**
   * 添加节点到选中集合
   */
  addToSelection(node: HyyMindMapNode): void {
    node.isSelected = true;
    this.stateManager.addSelectedNode(node);
  }

  /**
   * 从选中集合移除节点
   */
  removeFromSelection(node: HyyMindMapNode): void {
    node.isSelected = false;
    this.stateManager.removeSelectedNode(node);
  }

  /**
   * 获取所有选中的节点
   */
  getSelectedNodes(): HyyMindMapNode[] {
    return Array.from(this.stateManager.getSelectionState().selectedNodes);
  }

  /**
   * 获取所有被选中的节点（包括激活节点和框选节点）
   */
  getAllSelectedNodes(): HyyMindMapNode[] {
    const allNodes = this.nodeManager.getAllNodes();
    return allNodes.filter((node) => node.isActive || node.isSelected);
  }

  /**
   * 清除所有选中状态
   */
  clearSelection(): void {
    const allNodes = this.nodeManager.getAllNodes();
    for (const node of allNodes) {
      node.isSelected = false;
      node.isActive = false;
    }

    this.stateManager.clearSelection();
  }

  /**
   * 范围选择（选择从 startNode 到 endNode 之间的所有同级节点）
   */
  selectRange(startNode: HyyMindMapNode, endNode: HyyMindMapNode): void {
    // 清除当前选中状态
    this.clearSelection();

    // 检查是否是同级节点
    if (startNode.parent !== endNode.parent) {
      // 如果不是同级节点，只选中这两个节点
      this.addToSelection(startNode);
      this.addToSelection(endNode);
      return;
    }

    // 获取父节点的子节点列表
    const parent = startNode.parent;
    if (!parent) {
      // 如果是根节点，只选中自己
      this.addToSelection(startNode);
      return;
    }

    const siblings = parent.children;
    const startIndex = siblings.indexOf(startNode);
    const endIndex = siblings.indexOf(endNode);

    if (startIndex === -1 || endIndex === -1) return;

    // 选中范围内的所有同级节点
    const [rangeStart, rangeEnd] = [
      Math.min(startIndex, endIndex),
      Math.max(startIndex, endIndex),
    ];

    for (let i = rangeStart; i <= rangeEnd; i++) {
      this.addToSelection(siblings[i]);
    }
  }

  /**
   * 框选（根据矩形选择节点）
   */
  selectByRect(rect: Rect): void {
    const allNodes = this.nodeManager.getAllNodes();
    const selectedNodes: HyyMindMapNode[] = [];

    for (const node of allNodes) {
      const isIntersecting = GeometryUtils.isNodeIntersectRect(node, rect);
      node.isSelected = isIntersecting;

      if (isIntersecting) {
        selectedNodes.push(node);
      }
    }

    this.stateManager.setSelectedNodes(selectedNodes);
  }

  /**
   * 选择所有节点
   */
  selectAll(): void {
    const allNodes = this.nodeManager.getAllNodes();
    allNodes.forEach((node) => {
      node.isSelected = true;
    });
    this.stateManager.setSelectedNodes(allNodes);
  }

  /**
   * 选择子树（选择节点及其所有后代）
   */
  selectSubtree(node: HyyMindMapNode): void {
    const subtreeNodes: HyyMindMapNode[] = [];

    TreeUtils.traverse(node, (n) => {
      n.isSelected = true;
      subtreeNodes.push(n);
    });

    this.stateManager.setSelectedNodes(subtreeNodes);
  }

  /**
   * 选择同级节点
   */
  selectSiblings(node: HyyMindMapNode): void {
    const siblings = TreeUtils.getSiblings(node);
    siblings.forEach((sibling) => {
      sibling.isSelected = true;
    });

    // 也选中当前节点
    node.isSelected = true;
    const allSelected = [...siblings, node];

    this.stateManager.setSelectedNodes(allSelected);
  }

  /**
   * 反选
   */
  invertSelection(): void {
    const allNodes = this.nodeManager.getAllNodes();
    const newSelectedNodes: HyyMindMapNode[] = [];

    allNodes.forEach((node) => {
      node.isSelected = !node.isSelected;
      if (node.isSelected) {
        newSelectedNodes.push(node);
      }
    });

    this.stateManager.setSelectedNodes(newSelectedNodes);
  }

  /**
   * 判断节点是否被选中
   */
  isNodeSelected(node: HyyMindMapNode): boolean {
    return node.isActive || node.isSelected;
  }

  /**
   * 获取选中节点数量
   */
  getSelectionCount(): number {
    return this.getAllSelectedNodes().length;
  }
}
