import type { HyyMindMapNode } from '../../core/HyyMindMapNode';
import type { Theme } from '../../types';
import { BaseRenderer } from './BaseRenderer';

export class NodeShapeRenderer extends BaseRenderer {
  /**
   * 渲染节点形状（背景和边框）
   * @param ctx Canvas 2D 上下文
   * @param node 节点数据
   * @param theme 主题配置
   * @param imageSelectedNodeId 当前图片选中的节点 ID，该节点不绘制选中边框
   */
  render(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    theme: Theme,
    imageSelectedNodeId?: string | null
  ): void {
    ctx.save();

    const { x, y, width, height } = node;
    const radius = theme.borderRadius;

    // 获取节点自定义样式
    const customBgColor = node.config?.backgroundColor;
    const customBorderColor = node.config?.borderColor;

    // 检查当前节点的图片是否被选中
    const isImageSelected = imageSelectedNodeId === node.id;

    // 1. 绘制背景
    ctx.fillStyle = customBgColor || theme.nodeBackgroundColor;
    this.drawRoundedRect(ctx, x, y, width, height, radius, true, false);

    // 2. 绘制边框
    // 如果该节点的图片被选中，则不绘制节点选中边框
    if ((node.isSelected || node.isActive) && !isImageSelected) {
      // 选中或激活状态 - 高亮边框
      ctx.strokeStyle = theme.nodeSelectedBorderColor;
      ctx.lineWidth = 2;
      this.drawRoundedRect(ctx, x, y, width, height, radius, false, true);
    } else if (node.isHover) {
      // Hover 状态
      ctx.strokeStyle = customBorderColor || theme.nodeBorderColor;
      ctx.lineWidth = 1.5;
      this.drawRoundedRect(ctx, x, y, width, height, radius, false, true);
    } else if (customBorderColor) {
      // 有自定义边框色时始终显示边框
      ctx.strokeStyle = customBorderColor;
      ctx.lineWidth = 1;
      this.drawRoundedRect(ctx, x, y, width, height, radius, false, true);
    }

    ctx.restore();
  }
}
