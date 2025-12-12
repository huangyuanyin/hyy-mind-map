import type { HyyMindMapNode } from '../../core/HyyMindMapNode';
import type { Theme } from '../../types';
import { BaseRenderer } from './BaseRenderer';
import { ICON } from '../../constants';

export class NodeContentRenderer extends BaseRenderer {
  // 图标缓存
  private iconCache: Map<string, HTMLImageElement> = new Map();
  private onIconLoaded?: () => void;

  /**
   * 设置图标加载完成回调
   */
  setIconLoadedCallback(callback: () => void): void {
    this.onIconLoaded = callback;
  }

  /**
   * 渲染节点内容（图标和文本）
   */
  render(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    theme: Theme
  ): void {
    ctx.save();

    const { x, y, width, height } = node;
    const maxWidth = width - theme.padding * 2;
    let textX = x + width / 2;
    const textY = y + height / 2;

    // 处理图标
    const icons = node.config?.icons;
    const singleIcon = node.config?.icon;
    const hasIcons = icons && Object.keys(icons).length > 0;
    const hasSingleIcon = !hasIcons && singleIcon;

    let totalIconWidth = 0;

    if (hasIcons && icons) {
      totalIconWidth = this.renderMultipleIcons(ctx, icons, textX, textY, maxWidth);
      if (totalIconWidth > 0) {
        textX =
          textX -
          maxWidth / 2 +
          totalIconWidth +
          ICON.TEXT_PADDING +
          (maxWidth - totalIconWidth - ICON.TEXT_PADDING) / 2;
      }
    } else if (hasSingleIcon && singleIcon) {
      const iconWidth = this.renderSingleIcon(ctx, singleIcon, textX, textY, maxWidth);
      if (iconWidth > 0) {
        totalIconWidth = ICON.SIZE;
        textX =
          textX -
          maxWidth / 2 +
          ICON.SIZE +
          ICON.TEXT_PADDING +
          (maxWidth - ICON.SIZE - ICON.TEXT_PADDING) / 2;
      }
    }

    // 获取节点自定义样式
    const customTextColor = node.config?.textColor;
    const customFontSize = node.config?.fontSize;

    // 绘制文本
    ctx.fillStyle = customTextColor || theme.nodeTextColor;
    const fontSize = customFontSize || theme.fontSize;
    ctx.font = `${fontSize}px ${theme.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textMaxWidth =
      hasIcons || hasSingleIcon
        ? maxWidth - totalIconWidth - ICON.TEXT_PADDING
        : maxWidth;
    ctx.fillText(node.text, textX, textY, textMaxWidth);

    ctx.restore();
  }

  /**
   * 渲染多个图标
   */
  private renderMultipleIcons(
    ctx: CanvasRenderingContext2D,
    icons: Record<string, string>,
    textX: number,
    textY: number,
    maxWidth: number
  ): number {
    const iconUrls: string[] = [];
    ICON.ORDER.forEach((category) => {
      if (icons[category]) {
        iconUrls.push(icons[category]);
      }
    });

    const iconCount = iconUrls.length;
    const totalIconWidth = iconCount * ICON.SIZE + (iconCount - 1) * ICON.GAP;
    let currentIconX = textX - maxWidth / 2;
    let allIconsLoaded = true;

    iconUrls.forEach((iconUrl) => {
      const iconImg = this.iconCache.get(iconUrl);

      if (iconImg?.complete) {
        const iconY = textY - ICON.SIZE / 2;
        ctx.drawImage(iconImg, currentIconX, iconY, ICON.SIZE, ICON.SIZE);
        currentIconX += ICON.SIZE + ICON.GAP;
      } else {
        allIconsLoaded = false;
        this.loadIcon(iconUrl);
      }
    });

    return allIconsLoaded ? totalIconWidth : 0;
  }

  /**
   * 渲染单个图标
   */
  private renderSingleIcon(
    ctx: CanvasRenderingContext2D,
    iconUrl: string,
    textX: number,
    textY: number,
    maxWidth: number
  ): number {
    const iconImg = this.iconCache.get(iconUrl);

    if (iconImg?.complete) {
      const iconX = textX - maxWidth / 2;
      const iconY = textY - ICON.SIZE / 2;
      ctx.drawImage(iconImg, iconX, iconY, ICON.SIZE, ICON.SIZE);
      return ICON.SIZE;
    }

    this.loadIcon(iconUrl);
    return 0;
  }

  /**
   * 加载图标
   */
  private loadIcon(iconUrl: string): void {
    if (this.iconCache.has(iconUrl)) return;

    const img = new Image();
    img.onload = () => {
      this.iconCache.set(iconUrl, img);
      if (this.onIconLoaded) {
        this.onIconLoaded();
      }
    };
    img.onerror = (err) => {
      console.error('Failed to load icon:', err);
    };
    img.src = iconUrl;
  }

  /**
   * 清除图标缓存
   */
  clearIconCache(): void {
    this.iconCache.clear();
  }
}
