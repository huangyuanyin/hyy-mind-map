import type { NodeData, NodeConfig, RichContent } from '../types';

/**
 * 思维导图节点类
 */
export class HyyMindMapNode {
  // 数据属性
  public id: string;
  public text: string;
  public richContent?: RichContent;
  public children: HyyMindMapNode[] = [];
  public parent: HyyMindMapNode | null = null;
  public config: NodeConfig;

  // 布局属性
  public x: number = 0;
  public y: number = 0;
  public width: number = 0;
  public height: number = 0;

  // 状态属性
  public isActive: boolean = false;
  public isHover: boolean = false;
  public isSelected: boolean = false;
  public isEditing: boolean = false;
  public expanded: boolean = true;

  // 根节点的左右展开状态（仅对根节点有效）
  public expandedLeft: boolean = true;
  public expandedRight: boolean = true;

  constructor(data: NodeData, parent?: HyyMindMapNode) {
    this.id = data.id;
    this.text = data.text;
    this.richContent = data.richContent;
    this.parent = parent || null;
    this.config = data.config || {};

    // 恢复位置信息（如果存在）
    if (data.x !== undefined) this.x = data.x;
    if (data.y !== undefined) this.y = data.y;
    if (data.width !== undefined) this.width = data.width;
    if (data.height !== undefined) this.height = data.height;

    // 恢复展开状态（如果存在）
    if (data.expanded !== undefined) this.expanded = data.expanded;
    if (data.expandedLeft !== undefined) this.expandedLeft = data.expandedLeft;
    if (data.expandedRight !== undefined) this.expandedRight = data.expandedRight;

    // 递归构建子节点
    if (data.children && data.children.length > 0) {
      this.children = data.children.map(
        (childData) => new HyyMindMapNode(childData, this)
      );
    }
  }

  /**
   * 判断点(x, y)是否在节点内
   */
  public contains(x: number, y: number): boolean {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }

  /**
   * 判断子节点在节点的哪一侧
   */
  public getChildrenDirection(): 'left' | 'right' | null {
    if (this.children.length === 0) return null;

    // 通过第一个子节点的位置判断方向
    const firstChild = this.children[0];

    // 如果子节点还没有被布局（x为初始值），暂时无法判断方向
    // 这种情况下，检查节点是否在父节点的左侧（如果有父节点的话）
    if (firstChild.x === 0 && firstChild.y === 0) {
      // 子节点还未布局，尝试通过父节点位置判断
      if (this.parent && this.parent.x !== 0) {
        // 如果当前节点在父节点左侧，子节点应该继续向左
        return this.x < this.parent.x ? 'left' : 'right';
      }
      // 默认向右
      return 'right';
    }

    return firstChild.x < this.x ? 'left' : 'right';
  }

  /**
   * 检查子节点是否分布在两侧（仅对根节点有效）
   */
  public hasChildrenOnBothSides(): boolean {
    if (this.children.length === 0 || this.parent !== null) return false;

    // 检查是否有子节点在左侧，有子节点在右侧
    let hasLeft = false;
    let hasRight = false;

    for (const child of this.children) {
      if (child.x < this.x) {
        hasLeft = true;
      } else if (child.x > this.x) {
        hasRight = true;
      }

      if (hasLeft && hasRight) return true;
    }

    return false;
  }

  /**
   * 获取指定方向的子节点数量（递归统计整个子树）
   */
  public getChildrenCountOnSide(side: 'left' | 'right'): number {
    if (this.children.length === 0) return 0;

    let count = 0;

    for (const child of this.children) {
      const isChildOnLeft = child.x < this.x;
      const childSide = isChildOnLeft ? 'left' : 'right';

      if (childSide === side) {
        // 计算该子节点及其所有后代节点
        count += 1 + this.countAllDescendants(child);
      }
    }

    return count;
  }

  /**
   * 递归统计所有后代节点数量
   */
  private countAllDescendants(node: HyyMindMapNode): number {
    let count = 0;
    for (const child of node.children) {
      count += 1 + this.countAllDescendants(child);
    }
    return count;
  }

  /**
   * 获取所有子节点数量
   */
  public getAllChildrenCount(): number {
    return this.countAllDescendants(this);
  }

  /**
   * 判断点击是否在展开/收起指示器上
   * @returns 'left' | 'right' | null - 返回点击的是哪一侧的指示器，或者没有点击指示器
   */
  public getClickedIndicatorSide(x: number, y: number): 'left' | 'right' | null {
    if (this.children.length === 0) {
      return null;
    }

    const circleRadius = 8; // 圆形半径
    const margin = 6;
    const centerY = this.y + this.height / 2;

    // 检查是否子节点分布在两侧（根节点）
    if (this.hasChildrenOnBothSides()) {
      // 需要检查左右两个指示器
      const leftCenterX = this.x - margin - circleRadius;
      const rightCenterX = this.x + this.width + margin + circleRadius;

      // 检查左侧指示器
      if (this.isPointInIndicator(x, y, leftCenterX, centerY)) {
        return 'left';
      }

      // 检查右侧指示器
      if (this.isPointInIndicator(x, y, rightCenterX, centerY)) {
        return 'right';
      }

      return null;
    } else {
      // 只有一侧有指示器
      const direction = this.getChildrenDirection();
      if (!direction) return null;

      let centerX: number;
      if (direction === 'left') {
        centerX = this.x - margin - circleRadius;
      } else {
        centerX = this.x + this.width + margin + circleRadius;
      }

      return this.isPointInIndicator(x, y, centerX, centerY) ? direction : null;
    }
  }

  /**
   * 判断点是否在指示器范围内
   */
  private isPointInIndicator(
    x: number,
    y: number,
    centerX: number,
    centerY: number
  ): boolean {
    const circleRadius = 8;
    const clickRadius = circleRadius + 2; // 稍微放大点击范围

    // 圆形碰撞检测
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= clickRadius;
  }

  /**
   * 判断点击是否在展开/收起指示器上（兼容旧接口）
   */
  public containsExpandIndicator(x: number, y: number): boolean {
    return this.getClickedIndicatorSide(x, y) !== null;
  }

  /**
   * 获取节点的边界框
   */
  public getBounds(): {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } {
    return {
      left: this.x,
      top: this.y,
      right: this.x + this.width,
      bottom: this.y + this.height,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * 添加子节点
   */
  public addChild(data: NodeData): HyyMindMapNode {
    const childNode = new HyyMindMapNode(data, this);
    this.children.push(childNode);
    return childNode;
  }

  /**
   * 移除子节点
   */
  public removeChild(id: string): boolean {
    const index = this.children.findIndex((child) => child.id === id);
    if (index > -1) {
      this.children.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 根据ID查找节点
   */
  public findNode(id: string): HyyMindMapNode | null {
    if (this.id === id) {
      return this;
    }

    for (const child of this.children) {
      const found = child.findNode(id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * 转换为纯数据对象
   */
  public toData(): NodeData {
    return {
      id: this.id,
      text: this.text,
      richContent: this.richContent,
      config: this.config,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      expanded: this.expanded,
      expandedLeft: this.expandedLeft,
      expandedRight: this.expandedRight,
      children: this.children.map((child) => child.toData()),
    };
  }

  /**
   * 重置状态
   */
  public reset(): void {
    this.isActive = false;
    this.isHover = false;
    this.isSelected = false;
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
  }
}
