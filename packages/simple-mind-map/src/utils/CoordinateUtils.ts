import type { Point, ViewState } from '../types';

export class CoordinateUtils {
  /**
   * 屏幕坐标 -> Canvas坐标（考虑DPI）
   */
  static screenToCanvas(
    clientX: number,
    clientY: number,
    canvasBounds: DOMRect
  ): Point {
    return {
      x: clientX - canvasBounds.left,
      y: clientY - canvasBounds.top,
    };
  }

  /**
   * Canvas坐标 -> 世界坐标（考虑缩放和平移）
   */
  static canvasToWorld(
    canvasX: number,
    canvasY: number,
    viewState: ViewState
  ): Point {
    const { scale, translateX, translateY } = viewState;
    return {
      x: (canvasX - translateX) / scale,
      y: (canvasY - translateY) / scale,
    };
  }

  /**
   * 世界坐标 -> Canvas坐标
   */
  static worldToCanvas(
    worldX: number,
    worldY: number,
    viewState: ViewState
  ): Point {
    const { scale, translateX, translateY } = viewState;
    return {
      x: worldX * scale + translateX,
      y: worldY * scale + translateY,
    };
  }

  /**
   * 屏幕坐标 -> 世界坐标（一步到位）
   */
  static screenToWorld(
    clientX: number,
    clientY: number,
    canvasBounds: DOMRect,
    viewState: ViewState
  ): Point {
    const canvas = this.screenToCanvas(clientX, clientY, canvasBounds);
    return this.canvasToWorld(canvas.x, canvas.y, viewState);
  }

  /**
   * 计算两点之间的距离
   */
  static distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 计算以指定点为中心缩放后的视图状态
   */
  static calculateZoomTransform(
    centerX: number,
    centerY: number,
    oldScale: number,
    newScale: number,
    oldTranslateX: number,
    oldTranslateY: number
  ): { translateX: number; translateY: number } {
    // 计算中心点在世界坐标系中的位置
    const worldX = (centerX - oldTranslateX) / oldScale;
    const worldY = (centerY - oldTranslateY) / oldScale;

    // 计算新的平移量，使世界坐标点保持在相同的屏幕位置
    return {
      translateX: centerX - worldX * newScale,
      translateY: centerY - worldY * newScale,
    };
  }
}
