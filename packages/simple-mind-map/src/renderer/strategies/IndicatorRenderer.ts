import type { HyyMindMapNode } from '../../core/HyyMindMapNode';
import type { Theme, Direction } from '../../types';
import { BaseRenderer } from './BaseRenderer';
import { EXPAND_INDICATOR, SHADOW } from '../../constants';
import { getLightColor } from '../../constants/theme';

export class IndicatorRenderer extends BaseRenderer {
  /**
   * 渲染展开指示器
   */
  render(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    theme: Theme
  ): void {
    // 只有选中或激活的节点才显示指示器
    if (node.children.length === 0 || (!node.isActive && !node.isSelected)) {
      return;
    }

    if (node.hasChildrenOnBothSides()) {
      this.renderIndicatorAtSide(ctx, node, 'left', theme);
      this.renderIndicatorAtSide(ctx, node, 'right', theme);
    } else {
      const direction = node.getChildrenDirection();
      if (direction) {
        this.renderIndicatorAtSide(ctx, node, direction, theme);
      }
    }
  }

  /**
   * 在指定方向绘制指示器
   */
  private renderIndicatorAtSide(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    direction: Direction,
    theme: Theme
  ): void {
    ctx.save();

    const { CIRCLE_RADIUS, MARGIN } = EXPAND_INDICATOR;
    const centerX =
      direction === 'left'
        ? node.x - MARGIN - CIRCLE_RADIUS
        : node.x + node.width + MARGIN + CIRCLE_RADIUS;
    const centerY = node.y + node.height / 2;

    // 获取展开状态和子节点数量
    const { isExpanded, childCount } = this.getExpandState(node, direction);

    if (!isExpanded && childCount > 0) {
      this.renderCollapsedIndicator(
        ctx,
        node,
        centerX,
        centerY,
        direction,
        childCount,
        theme
      );
    } else {
      this.renderExpandedIndicator(ctx, node, centerX, centerY, direction, theme);
    }

    ctx.restore();
  }

  /**
   * 获取展开状态
   */
  private getExpandState(
    node: HyyMindMapNode,
    direction: Direction
  ): { isExpanded: boolean; childCount: number } {
    if (node.hasChildrenOnBothSides()) {
      return {
        isExpanded: direction === 'left' ? node.expandedLeft : node.expandedRight,
        childCount: node.getChildrenCountOnSide(direction),
      };
    }
    return {
      isExpanded: node.expanded,
      childCount: node.getAllChildrenCount(),
    };
  }

  /**
   * 渲染收起状态指示器（显示子节点数量）
   */
  private renderCollapsedIndicator(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    centerX: number,
    centerY: number,
    direction: Direction,
    childCount: number,
    theme: Theme
  ): void {
    const { CIRCLE_RADIUS } = EXPAND_INDICATOR;
    const themeColor = theme.nodeBorderColor;
    const lightColor = getLightColor(themeColor);

    // 绘制连接线
    this.renderIndicatorLine(ctx, node, centerX, centerY, direction, themeColor);

    // 绘制阴影和背景
    this.applyShadow(ctx, SHADOW.COLOR, SHADOW.BLUR, SHADOW.OFFSET_Y);
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    this.clearShadow(ctx);

    // 绘制边框
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制数字
    ctx.fillStyle = themeColor;
    ctx.font = `600 ${theme.fontSize - 1}px ${theme.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(childCount), centerX, centerY);
  }

  /**
   * 渲染展开状态指示器（显示减号）
   */
  private renderExpandedIndicator(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    centerX: number,
    centerY: number,
    direction: Direction,
    theme: Theme
  ): void {
    const { CIRCLE_RADIUS, SYMBOL_HALF_WIDTH } = EXPAND_INDICATOR;

    // 绘制阴影和背景
    this.applyShadow(ctx, SHADOW.COLOR, SHADOW.BLUR, SHADOW.OFFSET_Y);
    ctx.fillStyle = theme.nodeBorderColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    this.clearShadow(ctx);

    // 绘制减号
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX - SYMBOL_HALF_WIDTH, centerY);
    ctx.lineTo(centerX + SYMBOL_HALF_WIDTH, centerY);
    ctx.stroke();

    // 绘制连接线（在最上层）
    this.renderIndicatorLine(
      ctx,
      node,
      centerX,
      centerY,
      direction,
      theme.nodeBorderColor
    );
  }

  /**
   * 渲染指示器连接线
   */
  private renderIndicatorLine(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    centerX: number,
    centerY: number,
    direction: Direction,
    color: string
  ): void {
    const { CIRCLE_RADIUS, LINE_WIDTH } = EXPAND_INDICATOR;
    const lineStartX = direction === 'left' ? node.x : node.x + node.width;
    const lineEndX =
      direction === 'left' ? centerX + CIRCLE_RADIUS : centerX - CIRCLE_RADIUS;

    ctx.strokeStyle = color;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lineStartX, centerY);
    ctx.lineTo(lineEndX, centerY);
    ctx.stroke();
  }
}
