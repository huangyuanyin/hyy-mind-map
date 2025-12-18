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
   * @param skipMeasure - 是否跳过尺寸测量（用于尺寸已由 DOM 更新的场景）
   */
  public layout(
    node: HyyMindMapNode,
    centerX: number,
    centerY: number,
    level = 0,
    direction: Direction = 'right',
    skipMeasure = false
  ): void {
    // 测量节点尺寸（除非跳过）
    if (!skipMeasure) {
      this.measureNode(node);
    }

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
      this.layoutRootChildren(node, skipMeasure);
    } else {
      this.layoutChildren(node, direction, level, skipMeasure);
    }
  }

  /**
   * 仅重新计算节点位置
   * 用于尺寸已由 DOM 更新后的重新布局
   */
  public layoutPositionsOnly(
    node: HyyMindMapNode,
    centerX: number,
    centerY: number
  ): void {
    this.layout(node, centerX, centerY, 0, 'right', true);
  }

  /**
   * 计算内容与图片组合后的尺寸
   * @param contentWidth 内容宽度
   * @param contentHeight 内容高度
   * @param imageWidth 图片宽度
   * @param imageHeight 图片高度
   * @param isHorizontal 图片是否在水平方向（左/右）
   * @param margin 图片与内容的间距
   */
  private calculateSizeWithImage(
    contentWidth: number,
    contentHeight: number,
    imageWidth: number,
    imageHeight: number,
    isHorizontal: boolean,
    margin: number
  ): { width: number; height: number } {
    if (isHorizontal) {
      // 图片在左右：宽度相加，高度取最大值
      return {
        width: Math.max(contentWidth + imageWidth + margin, LAYOUT.MIN_NODE_WIDTH),
        height: Math.max(contentHeight, imageHeight),
      };
    }
    // 图片在上下：宽度取最大值，高度相加
    return {
      width: Math.max(contentWidth, imageWidth + 20, LAYOUT.MIN_NODE_WIDTH),
      height: contentHeight + imageHeight + margin,
    };
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
    const IMAGE_MARGIN = 8;
    const imagePosition = imageData?.position || 'above';
    const isImageHorizontal = imagePosition === 'left' || imagePosition === 'right';
    let imageWidth = 0;
    let imageHeight = 0;

    if (imageData) {
      imageWidth = imageData.displayWidth || 200;
      const aspectRatio = (imageData.height || 1) / (imageData.width || 1);
      imageHeight = Math.floor(imageWidth * aspectRatio);
    }

    // 根据附加内容类型选择测量方法
    let contentSize: { width: number; height: number };

    if (attachment?.type === 'table' && attachment.table) {
      contentSize = this.renderer.measureTable(attachment.table);
      contentSize.width += iconWidth;
    } else if (attachment?.type === 'code' && attachment.codeBlock) {
      contentSize = this.renderer.measureCodeBlock(attachment.codeBlock);
      contentSize.width += iconWidth;
    } else {
      // 普通文本节点
      const fontSize = node.config?.fontSize;
      const textToMeasure = node.richContent?.text || node.text;
      contentSize = this.renderer.measureText(textToMeasure, icons, fontSize);

      // 限制最大宽度，超过则换行
      if (contentSize.width > LAYOUT.MAX_NODE_WIDTH) {
        const lineCount = Math.ceil(contentSize.width / (LAYOUT.MAX_NODE_WIDTH - 20));
        const actualFontSize = fontSize || 14;
        const lineHeight = actualFontSize * 1.5;
        const padding = 10;
        contentSize = {
          width: LAYOUT.MAX_NODE_WIDTH,
          height: lineCount * lineHeight + padding * 2,
        };
      }
    }

    // 合并内容尺寸与图片尺寸
    if (imageData) {
      const finalSize = this.calculateSizeWithImage(
        contentSize.width,
        contentSize.height,
        imageWidth,
        imageHeight,
        isImageHorizontal,
        IMAGE_MARGIN
      );
      node.width = finalSize.width;
      node.height = finalSize.height;
    } else {
      node.width = Math.max(contentSize.width, LAYOUT.MIN_NODE_WIDTH);
      node.height = contentSize.height;
    }
  }

  /**
   * 布局根节点的子节点（左右分布）
   */
  private layoutRootChildren(node: HyyMindMapNode, skipMeasure = false): void {
    const { HORIZONTAL_GAP } = LAYOUT;

    // 分成左右两部分
    const mid = Math.ceil(node.children.length / 2);
    const rightChildren = node.children.slice(0, mid);
    const leftChildren = node.children.slice(mid);

    const rootCenterY = node.y + node.height / 2;

    // 先测量所有子节点尺寸，以便计算子树高度（除非跳过）
    if (!skipMeasure) {
      for (const child of node.children) {
        this.measureAllNodes(child);
      }
    }

    // 布局右侧子节点
    this.layoutChildrenOnSide(
      rightChildren,
      'right',
      node.x + node.width + HORIZONTAL_GAP,
      rootCenterY,
      skipMeasure
    );

    // 布局左侧子节点
    this.layoutChildrenOnSide(
      leftChildren,
      'left',
      node.x,
      rootCenterY,
      skipMeasure
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
    children: HyyMindMapNode[],
    direction: Direction,
    baseX: number,
    centerY: number,
    skipMeasure = false
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
      this.layout(child, childX, childY, 1, direction, skipMeasure);

      currentY += subtreeHeight + NODE_SPACING;
    }
  }

  /**
   * 布局普通节点的子节点
   */
  private layoutChildren(
    node: HyyMindMapNode,
    direction: Direction,
    level: number,
    skipMeasure = false
  ): void {
    if (node.children.length === 0) return;

    const { NODE_SPACING, HORIZONTAL_GAP } = LAYOUT;

    // 先测量所有子节点尺寸（除非跳过）
    if (!skipMeasure) {
      for (const child of node.children) {
        this.measureAllNodes(child);
      }
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
      this.layout(child, childX, childY, level + 1, direction, skipMeasure);

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

