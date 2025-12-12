import type { Theme, Rect } from '../../types';

export class SelectionRenderer {
  /**
   * 渲染框选矩形
   */
  render(ctx: CanvasRenderingContext2D, rect: Rect, theme: Theme): void {
    if (!rect) return;

    ctx.save();

    const { x, y, width, height } = rect;

    // 填充
    ctx.fillStyle = theme.selectionRectFillColor;
    ctx.fillRect(x, y, width, height);

    // 边框（虚线）
    ctx.strokeStyle = theme.selectionRectColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);

    ctx.restore();
  }
}
