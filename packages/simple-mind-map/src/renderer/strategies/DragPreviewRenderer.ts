import type { HyyMindMapNode } from '../../core/HyyMindMapNode';
import type { Theme, DragPreviewState, DropPosition } from '../../types';

export class DragPreviewRenderer {
  /**
   * 渲染拖拽预览
   */
  render(
    ctx: CanvasRenderingContext2D,
    dragPreview: DragPreviewState,
    theme: Theme
  ): void {
    if (!dragPreview.isDragging || !dragPreview.dragNode) return;

    const ghostPos = dragPreview.ghostPosition;

    // 1. 渲染分身节点
    if (ghostPos) {
      this.renderGhostNode(ctx, dragPreview.dragNode, ghostPos.x, ghostPos.y, theme);
    }

    // 2. 渲染放置指示器
    if (dragPreview.dropTarget && dragPreview.dropPosition) {
      this.renderDropIndicator(
        ctx,
        dragPreview.dragNode,
        dragPreview.dropTarget,
        dragPreview.dropPosition,
        theme
      );
    }
  }

  /**
   * 渲染分身节点
   */
  private renderGhostNode(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    x: number,
    y: number,
    theme: Theme
  ): void {
    ctx.save();

    ctx.globalAlpha = 0.7;

    const width = node.width;
    const height = node.height;
    const radius = theme.borderRadius;

    // 绘制背景
    ctx.fillStyle = theme.nodeBackgroundColor;
    this.drawRoundedRect(
      ctx,
      x - width / 2,
      y - height / 2,
      width,
      height,
      radius,
      true,
      false
    );

    // 绘制边框
    ctx.strokeStyle = theme.nodeBorderColor;
    ctx.lineWidth = 2;
    this.drawRoundedRect(
      ctx,
      x - width / 2,
      y - height / 2,
      width,
      height,
      radius,
      false,
      true
    );

    // 绘制文本
    ctx.fillStyle = theme.nodeTextColor;
    ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.text, x, y, width - theme.padding * 2);

    ctx.restore();
  }

  /**
   * 渲染放置指示器
   */
  private renderDropIndicator(
    ctx: CanvasRenderingContext2D,
    dragNode: HyyMindMapNode,
    targetNode: HyyMindMapNode,
    position: DropPosition,
    theme: Theme
  ): void {
    ctx.save();

    const indicatorColor = '#FF6B35'; // 橙色
    const nodeWidth = dragNode.width;
    const nodeHeight = dragNode.height;

    // 计算预览位置
    const preview = this.calculatePreviewPosition(
      dragNode,
      targetNode,
      position,
      nodeWidth,
      nodeHeight
    );

    if (!preview) {
      ctx.restore();
      return;
    }

    // 1. 绘制预览连接线（贝塞尔曲线）
    this.drawPreviewLine(
      ctx,
      preview.lineStartX,
      preview.lineStartY,
      preview.lineEndX,
      preview.lineEndY,
      indicatorColor,
      theme
    );

    // 2. 绘制预览节点框
    this.drawPreviewNode(
      ctx,
      preview.previewX,
      preview.previewY,
      nodeWidth,
      nodeHeight,
      dragNode.text,
      indicatorColor,
      theme
    );

    ctx.restore();
  }

  /**
   * 计算预览位置
   */
  private calculatePreviewPosition(
    _dragNode: HyyMindMapNode,
    targetNode: HyyMindMapNode,
    position: DropPosition,
    nodeWidth: number,
    nodeHeight: number
  ): {
    previewX: number;
    previewY: number;
    lineStartX: number;
    lineStartY: number;
    lineEndX: number;
    lineEndY: number;
  } | null {
    const horizontalGap = 100;
    const verticalGap = 20;

    if (position === 'inside') {
      return this.calculateInsidePosition(
        targetNode,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap
      );
    } else {
      return this.calculateSiblingPosition(
        targetNode,
        position,
        nodeWidth,
        nodeHeight,
        verticalGap
      );
    }
  }

  /**
   * 计算 inside 位置
   */
  private calculateInsidePosition(
    targetNode: HyyMindMapNode,
    nodeWidth: number,
    nodeHeight: number,
    horizontalGap: number,
    _verticalGap: number
  ) {
    const direction = targetNode.parent
      ? targetNode.x < targetNode.parent.x
        ? 'left'
        : 'right'
      : 'right';

    let previewX: number;
    const previewY = targetNode.y + (targetNode.height - nodeHeight) / 2;

    let lineStartX: number;
    let lineEndX: number;
    const lineStartY = targetNode.y + targetNode.height / 2;
    const lineEndY = previewY + nodeHeight / 2;

    if (direction === 'right') {
      previewX = targetNode.x + targetNode.width + horizontalGap;
      lineStartX = targetNode.x + targetNode.width;
      lineEndX = previewX;
    } else {
      previewX = targetNode.x - horizontalGap - nodeWidth;
      lineStartX = targetNode.x;
      lineEndX = previewX + nodeWidth;
    }

    return { previewX, previewY, lineStartX, lineStartY, lineEndX, lineEndY };
  }

  /**
   * 计算 before/after 位置
   */
  private calculateSiblingPosition(
    targetNode: HyyMindMapNode,
    position: 'before' | 'after',
    nodeWidth: number,
    nodeHeight: number,
    verticalGap: number
  ) {
    const parent = targetNode.parent;
    if (!parent) return null;

    const direction = targetNode.x < parent.x ? 'left' : 'right';
    const previewX = targetNode.x;
    const previewY =
      position === 'before'
        ? targetNode.y - verticalGap - nodeHeight
        : targetNode.y + targetNode.height + verticalGap;

    const lineStartX = direction === 'right' ? parent.x + parent.width : parent.x;
    const lineEndX = direction === 'right' ? previewX : previewX + nodeWidth;
    const lineStartY = parent.y + parent.height / 2;
    const lineEndY = previewY + nodeHeight / 2;

    return { previewX, previewY, lineStartX, lineStartY, lineEndX, lineEndY };
  }

  /**
   * 绘制预览连接线
   */
  private drawPreviewLine(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string,
    theme: Theme
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = theme.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([6, 4]);

    const distance = Math.abs(endX - startX);
    const controlPointOffset = Math.min(distance * 0.5, 100);
    const isLeft = endX < startX;

    const cp1x = isLeft ? startX - controlPointOffset : startX + controlPointOffset;
    const cp1y = startY;
    const cp2x = isLeft ? endX + controlPointOffset : endX - controlPointOffset;
    const cp2y = endY;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  /**
   * 绘制预览节点
   */
  private drawPreviewNode(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    color: string,
    theme: Theme
  ): void {
    // 绘制节点框
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = color + '20';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    this.drawRoundedRect(ctx, x, y, width, height, theme.borderRadius, true, true);

    // 绘制文本
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = color;
    ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2, width - theme.padding * 2);
  }

  /**
   * 绘制圆角矩形
   */
  private drawRoundedRect(
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
}
