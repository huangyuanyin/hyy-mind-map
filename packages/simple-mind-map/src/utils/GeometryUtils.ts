import type { Point, Rect } from '../types';
import type { HyyMindMapNode } from '../core/HyyMindMapNode';

export class GeometryUtils {
  /**
   * 判断点是否在矩形内
   */
  static isPointInRect(point: Point, rect: Rect): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  /**
   * 判断点是否在节点内
   */
  static isPointInNode(point: Point, node: HyyMindMapNode): boolean {
    return (
      point.x >= node.x &&
      point.x <= node.x + node.width &&
      point.y >= node.y &&
      point.y <= node.y + node.height
    );
  }

  /**
   * 判断点是否在节点附近（扩展区域）
   */
  static isPointNearNode(
    point: Point,
    node: HyyMindMapNode,
    margin: number = 20
  ): boolean {
    return (
      point.x >= node.x - margin &&
      point.x <= node.x + node.width + margin &&
      point.y >= node.y - margin &&
      point.y <= node.y + node.height + margin
    );
  }

  /**
   * 判断两个矩形是否相交
   */
  static isRectIntersect(rect1: Rect, rect2: Rect): boolean {
    return !(
      rect1.x > rect2.x + rect2.width ||
      rect1.x + rect1.width < rect2.x ||
      rect1.y > rect2.y + rect2.height ||
      rect1.y + rect1.height < rect2.y
    );
  }

  /**
   * 判断节点是否与矩形相交
   */
  static isNodeIntersectRect(node: HyyMindMapNode, rect: Rect): boolean {
    return this.isRectIntersect(
      { x: node.x, y: node.y, width: node.width, height: node.height },
      rect
    );
  }

  /**
   * 标准化矩形（确保 width 和 height 为正数）
   */
  static normalizeRect(start: Point, end: Point): Rect {
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  /**
   * 计算节点的中心点
   */
  static getNodeCenter(node: HyyMindMapNode): Point {
    return {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2,
    };
  }

  /**
   * 计算矩形的中心点
   */
  static getRectCenter(rect: Rect): Point {
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };
  }

  /**
   * 计算圆形区域（用于展开指示器）
   */
  static isPointInCircle(
    point: Point,
    center: Point,
    radius: number
  ): boolean {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  /**
   * 判断点在节点的哪个区域（用于拖拽放置）
   */
  static getDropZone(
    point: Point,
    node: HyyMindMapNode
  ): 'top' | 'middle' | 'bottom' {
    const relativeY = point.y - node.y;
    const height = node.height;

    if (relativeY < height * 0.3) {
      return 'top';
    } else if (relativeY > height * 0.7) {
      return 'bottom';
    } else {
      return 'middle';
    }
  }
}
