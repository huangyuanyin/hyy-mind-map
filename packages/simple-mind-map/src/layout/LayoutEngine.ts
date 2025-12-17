import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { IRenderer } from '../types/interfaces';
import type { Direction } from '../types';
import { LAYOUT, ICON } from '../constants';

/**
 * 布局引擎
 * 负责计算思维导图节点的位置
 */
export class LayoutEngine {
  private renderer: IRenderer;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  /**
   * 计算节点布局
   * @param node - 要布局的节点
   * @param centerX - 中心X坐标
   * @param centerY - 中心Y坐标
   * @param level - 节点层级
   * @param direction - 布局方向
   */
  public layout(
    node: HyyMindMapNode,
    centerX: number,
    centerY: number,
    level = 0,
    direction: Direction = 'right'
  ): void {
    // 测量节点尺寸
    this.measureNode(node);

    // 设置节点位置
    if (level === 0) {
      // 根节点居中
      node.x = centerX - node.width / 2;
      node.y = centerY - node.height / 2;
    } else {
      // 子节点使用传入的坐标
      node.x = centerX;
      node.y = centerY;
    }

    // 布局子节点
    if (level === 0 && node.children.length > 0) {
      this.layoutRootChildren(node);
    } else {
      this.layoutChildren(node, direction, level);
    }
  }

  /**
   * 测量节点尺寸
   */
  private measureNode(node: HyyMindMapNode): void {
    const attachment = node.config?.attachment;
    const icons = node.config?.icons ?? node.config?.icon;
    const imageData = node.config?.image;
    
    // 计算图标宽度
    let iconWidth = 0;
    if (icons) {
      if (typeof icons === 'string') {
        iconWidth = ICON.SIZE + ICON.TEXT_PADDING;
      } else {
        const iconCount = Object.keys(icons).length;
        if (iconCount > 0) {
          iconWidth = iconCount * ICON.SIZE + (iconCount - 1) * ICON.GAP + ICON.TEXT_PADDING;
        }
      }
    }
    
    // 计算图片尺寸
    let imageWidth = 0;
    let imageHeight = 0;
    const IMAGE_MARGIN = 8; // 图片与文本的间距
    
    if (imageData) {
      imageWidth = imageData.displayWidth || 200;
      const aspectRatio = (imageData.height || 1) / (imageData.width || 1);
      imageHeight = Math.floor(imageWidth * aspectRatio);
    }
    
    // 根据附加内容类型选择测量方法
    if (attachment?.type === 'table' && attachment.table) {
      const size = this.renderer.measureTable(attachment.table);
      node.width = Math.max(size.width + iconWidth, imageWidth + 20, LAYOUT.MIN_NODE_WIDTH);
      node.height = size.height + (imageData ? imageHeight + IMAGE_MARGIN : 0);
    } else if (attachment?.type === 'code' && attachment.codeBlock) {
      const size = this.renderer.measureCodeBlock(attachment.codeBlock);
      node.width = Math.max(size.width + iconWidth, imageWidth + 20, LAYOUT.MIN_NODE_WIDTH);
      node.height = size.height + (imageData ? imageHeight + IMAGE_MARGIN : 0);
    } else {
      // 普通文本节点
      const fontSize = node.config?.fontSize;
      const textToMeasure = node.richContent?.text || node.text;
      const size = this.renderer.measureText(textToMeasure, icons, fontSize);
      
      // 限制最大宽度，超过则换行
      if (size.width > LAYOUT.MAX_NODE_WIDTH) {
        node.width = Math.max(LAYOUT.MAX_NODE_WIDTH, imageWidth + 20);
        // 计算换行后的行数和高度
        const lineCount = Math.ceil(size.width / (LAYOUT.MAX_NODE_WIDTH - 20)); // 减去 padding
        const actualFontSize = fontSize || 14;
        const lineHeight = actualFontSize * 1.5;
        const padding = 10;
        node.height = lineCount * lineHeight + padding * 2 + (imageData ? imageHeight + IMAGE_MARGIN : 0);
      } else {
        node.width = Math.max(size.width, imageWidth + 20, LAYOUT.MIN_NODE_WIDTH);
        node.height = size.height + (imageData ? imageHeight + IMAGE_MARGIN : 0);
      }
    }
  }

  /**
   * 布局根节点的子节点（左右分布）
   */
  private layoutRootChildren(node: HyyMindMapNode): void {
    const { HORIZONTAL_GAP } = LAYOUT;

    // 分成左右两部分
    const mid = Math.ceil(node.children.length / 2);
    const rightChildren = node.children.slice(0, mid);
    const leftChildren = node.children.slice(mid);

    const rootCenterY = node.y + node.height / 2;

    // 先测量所有子节点尺寸，以便计算子树高度
    for (const child of node.children) {
      this.measureAllNodes(child);
    }

    // 布局右侧子节点
    this.layoutChildrenOnSide(
      node,
      rightChildren,
      'right',
      node.x + node.width + HORIZONTAL_GAP,
      rootCenterY
    );

    // 布局左侧子节点
    this.layoutChildrenOnSide(
      node,
      leftChildren,
      'left',
      node.x,
      rootCenterY
    );
  }

  /**
   * 递归测量所有节点尺寸
   */
  private measureAllNodes(node: HyyMindMapNode): void {
    this.measureNode(node);
    for (const child of node.children) {
      this.measureAllNodes(child);
    }
  }

  /**
   * 布局指定方向的子节点
   */
  private layoutChildrenOnSide(
    _parent: HyyMindMapNode,
    children: HyyMindMapNode[],
    direction: Direction,
    baseX: number,
    centerY: number
  ): void {
    if (children.length === 0) return;

    const { NODE_SPACING, HORIZONTAL_GAP } = LAYOUT;

    // 计算该侧所有子节点的子树总高度
    let totalSubtreeHeight = 0;
    for (const child of children) {
      totalSubtreeHeight += this.getSubtreeHeight(child) + NODE_SPACING;
    }
    totalSubtreeHeight -= NODE_SPACING;

    // 从居中位置开始布局
    let currentY = centerY - totalSubtreeHeight / 2;

    for (const child of children) {
      const subtreeHeight = this.getSubtreeHeight(child);
      const childWidth = Math.max(child.width, LAYOUT.MIN_NODE_WIDTH);

      let childX: number;
      if (direction === 'right') {
        childX = baseX;
      } else {
        childX = baseX - childWidth - HORIZONTAL_GAP;
      }

      // 将子节点放置在其子树的垂直中心位置
      const childY = currentY + (subtreeHeight - child.height) / 2;
      this.layout(child, childX, childY, 1, direction);

      currentY += subtreeHeight + NODE_SPACING;
    }
  }

  /**
   * 布局普通节点的子节点
   */
  private layoutChildren(
    node: HyyMindMapNode,
    direction: Direction,
    level: number
  ): void {
    if (node.children.length === 0) return;

    const { NODE_SPACING, HORIZONTAL_GAP } = LAYOUT;

    // 先测量所有子节点尺寸
    for (const child of node.children) {
      this.measureAllNodes(child);
    }

    // 计算所有子节点的子树总高度
    let totalChildrenHeight = 0;
    for (const child of node.children) {
      totalChildrenHeight += this.getSubtreeHeight(child) + NODE_SPACING;
    }
    totalChildrenHeight -= NODE_SPACING;

    // 从父节点中心位置开始，使子节点组垂直居中
    const parentCenterY = node.y + node.height / 2;
    let currentY = parentCenterY - totalChildrenHeight / 2;

    for (const child of node.children) {
      const subtreeHeight = this.getSubtreeHeight(child);
      const childWidth = Math.max(child.width, LAYOUT.MIN_NODE_WIDTH);

      let childX: number;
      if (direction === 'right') {
        childX = node.x + node.width + HORIZONTAL_GAP;
      } else {
        childX = node.x - childWidth - HORIZONTAL_GAP;
      }

      // 将子节点放置在其子树的垂直中心位置
      const childY = currentY + (subtreeHeight - child.height) / 2;
      this.layout(child, childX, childY, level + 1, direction);

      currentY += subtreeHeight + NODE_SPACING;
    }
  }

  /**
   * 获取子树高度
   */
  public getSubtreeHeight(node: HyyMindMapNode): number {
    if (node.children.length === 0) {
      return node.height;
    }

    let totalHeight = 0;
    for (const child of node.children) {
      totalHeight += this.getSubtreeHeight(child) + LAYOUT.NODE_SPACING;
    }
    totalHeight -= LAYOUT.NODE_SPACING;

    return Math.max(node.height, totalHeight);
  }

  /**
   * 仅重新计算节点尺寸（不改变位置）
   */
  public recalculateSizes(node: HyyMindMapNode): void {
    this.measureNode(node);
    for (const child of node.children) {
      this.recalculateSizes(child);
    }
  }
}

