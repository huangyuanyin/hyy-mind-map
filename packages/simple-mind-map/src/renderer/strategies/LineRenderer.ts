import type { HyyMindMapNode } from '../../core/HyyMindMapNode';
import type { Theme } from '../../types';
import { BaseRenderer } from './BaseRenderer';

export class LineRenderer extends BaseRenderer {
  /**
   * 渲染节点的所有连线
   */
  render(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    theme: Theme
  ): void {
    if (!node || !this.shouldNodeExpand(node)) return;

    for (const child of node.children) {
      if (this.shouldChildBeVisible(node, child)) {
        this.renderLine(ctx, node, child, theme);
      }
    }
  }

  /**
   * 判断节点是否应该展开
   */
  private shouldNodeExpand(node: HyyMindMapNode): boolean {
    if (node.hasChildrenOnBothSides()) {
      return node.expandedLeft || node.expandedRight;
    }
    return node.expanded;
  }

  /**
   * 判断子节点是否应该可见
   */
  private shouldChildBeVisible(
    parent: HyyMindMapNode,
    child: HyyMindMapNode
  ): boolean {
    if (parent.hasChildrenOnBothSides()) {
      const isChildOnLeft = child.x < parent.x;
      return isChildOnLeft ? parent.expandedLeft : parent.expandedRight;
    }
    return parent.expanded;
  }

  /**
   * 绘制单条连线（贝塞尔曲线）
   */
  private renderLine(
    ctx: CanvasRenderingContext2D,
    from: HyyMindMapNode,
    to: HyyMindMapNode,
    theme: Theme
  ): void {
    ctx.save();

    const isChildOnLeft = to.x < from.x;
    const { startX, startY, endX, endY } = this.calculateLineEndpoints(
      from,
      to,
      isChildOnLeft
    );

    ctx.strokeStyle = theme.lineColor;
    ctx.lineWidth = theme.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 绘制贝塞尔曲线
    this.drawBezierCurve(ctx, startX, startY, endX, endY, isChildOnLeft);

    ctx.restore();
  }

  /**
   * 计算连线端点
   */
  private calculateLineEndpoints(
    from: HyyMindMapNode,
    to: HyyMindMapNode,
    isChildOnLeft: boolean
  ): { startX: number; startY: number; endX: number; endY: number } {
    if (isChildOnLeft) {
      return {
        startX: from.x,
        startY: from.y + from.height / 2,
        endX: to.x + to.width,
        endY: to.y + to.height / 2,
      };
    }
    return {
      startX: from.x + from.width,
      startY: from.y + from.height / 2,
      endX: to.x,
      endY: to.y + to.height / 2,
    };
  }

  /**
   * 绘制贝塞尔曲线
   */
  private drawBezierCurve(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    isChildOnLeft: boolean
  ): void {
    const distance = Math.abs(endX - startX);
    const controlPointOffset = Math.min(distance * 0.5, 100);

    const cp1x = isChildOnLeft
      ? startX - controlPointOffset
      : startX + controlPointOffset;
    const cp1y = startY;
    const cp2x = isChildOnLeft
      ? endX + controlPointOffset
      : endX - controlPointOffset;
    const cp2y = endY;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.stroke();
  }
}
