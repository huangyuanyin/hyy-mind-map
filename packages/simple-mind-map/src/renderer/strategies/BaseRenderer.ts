
import type { HyyMindMapNode } from '../../core/HyyMindMapNode';
import type { Theme } from '../../types';

export interface ISubRenderer {
  /**
   * 渲染方法
   * @param ctx Canvas 上下文
   * @param node 要渲染的节点
   * @param theme 主题配置
   */
  render(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    theme: Theme
  ): void;
}

/**
 * 抽象渲染器基类
 */
export abstract class BaseRenderer implements ISubRenderer {
  abstract render(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    theme: Theme
  ): void;

  /**
   * 绘制圆角矩形
   */
  protected drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean,
    stroke: boolean
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  /**
   * 应用阴影
   */
  protected applyShadow(
    ctx: CanvasRenderingContext2D,
    color: string = 'rgba(0, 0, 0, 0.1)',
    blur: number = 4,
    offsetY: number = 2
  ): void {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = offsetY;
  }

  /**
   * 清除阴影
   */
  protected clearShadow(ctx: CanvasRenderingContext2D): void {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
}
