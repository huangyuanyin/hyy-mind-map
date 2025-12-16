import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { Theme, Rect, TextMeasurement, Direction, DragPreviewState } from '../types';
import type { IRenderer } from '../types/interfaces';
import { DEFAULT_THEME, getLightColor } from '../constants/theme';
import { ICON, SHADOW, EXPAND_INDICATOR, TABLE } from '../constants';

/**
 * 渲染器选项
 */
export interface RendererOptions {
  /** 主题配置 */
  theme?: Partial<Theme>;
  /** 是否使用 DOM 渲染节点（Canvas 只渲染连线） */
  useDOMNodes?: boolean;
}

/**
 * Renderer - 渲染引擎
 * 负责Canvas绘制
 */
export class Renderer implements IRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private theme: Theme;

  // 离屏Canvas（性能优化）
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  // 变换矩阵
  private scale = 1;
  private translateX = 0;
  private translateY = 0;

  // 框选矩形
  private selectionRect: Rect | null = null;

  // 图标缓存
  private iconCache: Map<string, HTMLImageElement> = new Map();

  // 当前渲染的根节点（用于图标加载完成后重新渲染）
  private currentRoot: HyyMindMapNode | null = null;

  // 拖拽预览状态
  private dragPreview: DragPreviewState | null = null;

  // 是否使用 DOM 渲染节点
  private useDOMNodes: boolean = false;

  constructor(canvas: HTMLCanvasElement, options?: RendererOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.theme = { ...DEFAULT_THEME, ...options?.theme };
    this.useDOMNodes = options?.useDOMNodes ?? false;

    // 创建离屏Canvas
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = canvas.width;
    this.offscreenCanvas.height = canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
  }

  /**
   * 设置是否使用 DOM 渲染节点
   */
  public setUseDOMNodes(value: boolean): void {
    this.useDOMNodes = value;
  }

  /**
   * 设置变换（缩放和平移）
   */
  public setTransform(scale: number, translateX: number, translateY: number): void {
    this.scale = scale;
    this.translateX = translateX;
    this.translateY = translateY;
  }

  /**
   * 设置框选矩形
   */
  public setSelectionRect(rect: Rect | null): void {
    this.selectionRect = rect;
  }

  /**
   * 设置拖拽预览状态
   */
  public setDragPreview(dragPreview: DragPreviewState | null): void {
    this.dragPreview = dragPreview;
  }

  /**
   * 更新离屏Canvas尺寸
   */
  public updateOffscreenCanvas(): void {
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
  }

  /**
   * 主渲染方法
   */
  public render(root: HyyMindMapNode | null): void {
    if (!root) return;

    this.currentRoot = root;
    const dpr = window.devicePixelRatio || 1;

    // 1. 清空离屏Canvas
    this.clearCanvas(this.offscreenCtx, dpr);

    // 2. 应用变换
    this.applyTransform(this.offscreenCtx);

    // 3. 绘制连线
    this.renderLines(root);

    // 4. 绘制节点（如果不是 DOM 渲染模式）
    if (!this.useDOMNodes) {
      this.renderNodes(root);
    }

    // 5. 绘制拖拽预览
    if (this.dragPreview?.isDragging) {
      this.renderDragPreview();
    }

    // 6. 绘制框选矩形
    if (this.selectionRect) {
      this.renderSelectionRect();
    }

    // 7. 复制到主Canvas
    this.copyToMainCanvas(dpr);
  }

  /**
   * 清空画布
   */
  private clearCanvas(ctx: CanvasRenderingContext2D, dpr: number): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = this.theme.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
  }

  /**
   * 应用变换到上下文
   */
  private applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this.translateX, this.translateY);
    ctx.scale(this.scale, this.scale);
  }

  /**
   * 复制到主Canvas
   */
  private copyToMainCanvas(dpr: number): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.ctx.fillStyle = this.theme.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  // ==================== 连线渲染 ====================

  /**
   * 递归绘制所有连线
   */
  private renderLines(node: HyyMindMapNode): void {
    if (!node || !this.shouldNodeExpand(node)) return;

    for (const child of node.children) {
      if (this.shouldChildBeVisible(node, child)) {
        this.renderLine(node, child);
        this.renderLines(child);
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
  private shouldChildBeVisible(parent: HyyMindMapNode, child: HyyMindMapNode): boolean {
    if (parent.hasChildrenOnBothSides()) {
      const isChildOnLeft = child.x < parent.x;
      return isChildOnLeft ? parent.expandedLeft : parent.expandedRight;
    }
    return parent.expanded;
  }

  /**
   * 绘制单条连线（贝塞尔曲线）
   */
  private renderLine(from: HyyMindMapNode, to: HyyMindMapNode): void {
    const ctx = this.offscreenCtx;
    ctx.save();

    const isChildOnLeft = to.x < from.x;
    const { startX, startY, endX, endY } = this.calculateLineEndpoints(from, to, isChildOnLeft);

    ctx.strokeStyle = this.theme.lineColor;
    ctx.lineWidth = this.theme.lineWidth;
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

    const cp1x = isChildOnLeft ? startX - controlPointOffset : startX + controlPointOffset;
    const cp1y = startY;
    const cp2x = isChildOnLeft ? endX + controlPointOffset : endX - controlPointOffset;
    const cp2y = endY;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.stroke();
  }

  // ==================== 节点渲染 ====================

  /**
   * 递归绘制所有节点
   */
  private renderNodes(node: HyyMindMapNode): void {
    if (!node) return;

    this.renderNode(node);

    for (const child of node.children) {
      if (this.shouldChildBeVisible(node, child)) {
        this.renderNodes(child);
      }
    }
  }

  /**
   * 绘制单个节点
   */
  private renderNode(node: HyyMindMapNode): void {
    const ctx = this.offscreenCtx;
    ctx.save();

    // 检查是否是被拖拽的节点
    const isDragging = this.dragPreview?.isDragging && this.dragPreview.dragNode === node;
    if (isDragging) {
      ctx.globalAlpha = 0.4; // 降低透明度
    }

    const { x, y, width, height } = node;
    const radius = this.theme.borderRadius;

    // 获取节点自定义样式
    const customBgColor = node.config?.backgroundColor;
    const customBorderColor = node.config?.borderColor;

    // 1. 绘制背景（支持自定义背景色）
    ctx.fillStyle = customBgColor || this.theme.nodeBackgroundColor;
    this.drawRoundedRect(ctx, x, y, width, height, radius, true, false);

    // 2. 绘制边框（hover、选中或激活时）
    if (node.isSelected || node.isActive) {
      ctx.strokeStyle = this.theme.nodeSelectedBorderColor;
      ctx.lineWidth = 2;
      this.drawRoundedRect(ctx, x, y, width, height, radius, false, true);
    } else if (node.isHover) {
      ctx.strokeStyle = customBorderColor || this.theme.nodeBorderColor;
      ctx.lineWidth = 1.5;
      this.drawRoundedRect(ctx, x, y, width, height, radius, false, true);
    } else if (customBorderColor) {
      // 有自定义边框色时始终显示边框
      ctx.strokeStyle = customBorderColor;
      ctx.lineWidth = 1;
      this.drawRoundedRect(ctx, x, y, width, height, radius, false, true);
    }

    // 3. 绘制图标和文本
    this.renderNodeContent(node, x, y, width, height);

    // 4. 绘制展开/收起指示器
    if (node.children.length > 0 && (node.isActive || node.isSelected)) {
      this.renderExpandIndicators(node);
    }

    ctx.restore();
  }

  /**
   * 绘制节点内容（图标和文本）
   */
  private renderNodeContent(
    node: HyyMindMapNode,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const ctx = this.offscreenCtx;
    const maxWidth = width - this.theme.padding * 2;
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
        textX = textX - (maxWidth / 2) + totalIconWidth + ICON.TEXT_PADDING + (maxWidth - totalIconWidth - ICON.TEXT_PADDING) / 2;
      }
    } else if (hasSingleIcon && singleIcon) {
      const iconWidth = this.renderSingleIcon(ctx, singleIcon, textX, textY, maxWidth);
      if (iconWidth > 0) {
        totalIconWidth = ICON.SIZE;
        textX = textX - (maxWidth / 2) + ICON.SIZE + ICON.TEXT_PADDING + (maxWidth - ICON.SIZE - ICON.TEXT_PADDING) / 2;
      }
    }

    // 获取节点自定义样式
    const customTextColor = node.config?.textColor;
    const customFontSize = node.config?.fontSize;

    // 绘制文本（支持自定义颜色和字号）
    ctx.fillStyle = customTextColor || this.theme.nodeTextColor;
    const fontSize = customFontSize || this.theme.fontSize;
    ctx.font = `${fontSize}px ${this.theme.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textMaxWidth = (hasIcons || hasSingleIcon)
      ? maxWidth - totalIconWidth - ICON.TEXT_PADDING
      : maxWidth;
    ctx.fillText(node.text, textX, textY, textMaxWidth);
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
    ICON.ORDER.forEach(category => {
      if (icons[category]) {
        iconUrls.push(icons[category]);
      }
    });

    const iconCount = iconUrls.length;
    const totalIconWidth = iconCount * ICON.SIZE + (iconCount - 1) * ICON.GAP;
    let currentIconX = textX - (maxWidth / 2);
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
      const iconX = textX - (maxWidth / 2);
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
      if (this.currentRoot) {
        this.render(this.currentRoot);
      }
    };
    img.onerror = (err) => {
      console.error('Failed to load icon:', err);
    };
    img.src = iconUrl;
  }

  // ==================== 展开指示器渲染 ====================

  /**
   * 渲染展开/收起指示器
   */
  private renderExpandIndicators(node: HyyMindMapNode): void {
    if (node.hasChildrenOnBothSides()) {
      this.renderExpandIndicatorAtSide(node, 'left');
      this.renderExpandIndicatorAtSide(node, 'right');
    } else {
      const direction = node.getChildrenDirection();
      if (direction) {
        this.renderExpandIndicatorAtSide(node, direction);
      }
    }
  }

  /**
   * 在指定方向绘制展开/收起指示器
   */
  private renderExpandIndicatorAtSide(node: HyyMindMapNode, direction: Direction): void {
    const ctx = this.offscreenCtx;
    ctx.save();

    const { CIRCLE_RADIUS, MARGIN } = EXPAND_INDICATOR;
    const centerX = direction === 'left'
      ? node.x - MARGIN - CIRCLE_RADIUS
      : node.x + node.width + MARGIN + CIRCLE_RADIUS;
    const centerY = node.y + node.height / 2;

    // 获取展开状态和子节点数量
    const { isExpanded, childCount } = this.getExpandState(node, direction);

    if (!isExpanded && childCount > 0) {
      this.renderCollapsedIndicator(ctx, node, centerX, centerY, direction, childCount);
    } else {
      this.renderExpandedIndicator(ctx, node, centerX, centerY, direction);
    }

    ctx.restore();
  }

  /**
   * 获取展开状态
   */
  private getExpandState(node: HyyMindMapNode, direction: Direction): { isExpanded: boolean; childCount: number } {
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
   * 渲染收起状态指示器
   */
  private renderCollapsedIndicator(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    centerX: number,
    centerY: number,
    direction: Direction,
    childCount: number
  ): void {
    const { CIRCLE_RADIUS } = EXPAND_INDICATOR;
    const themeColor = this.theme.nodeBorderColor;
    const lightColor = getLightColor(themeColor);

    // 绘制连接线
    this.renderIndicatorLine(ctx, node, centerX, centerY, direction, themeColor);

    // 绘制阴影和背景
    this.applyShadow(ctx);
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
    ctx.font = `600 ${this.theme.fontSize - 1}px ${this.theme.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(childCount), centerX, centerY);
  }

  /**
   * 渲染展开状态指示器
   */
  private renderExpandedIndicator(
    ctx: CanvasRenderingContext2D,
    node: HyyMindMapNode,
    centerX: number,
    centerY: number,
    direction: Direction
  ): void {
    const { CIRCLE_RADIUS, SYMBOL_HALF_WIDTH } = EXPAND_INDICATOR;

    // 绘制阴影和背景
    this.applyShadow(ctx);
    ctx.fillStyle = this.theme.nodeBorderColor;
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
    this.renderIndicatorLine(ctx, node, centerX, centerY, direction, this.theme.nodeBorderColor);
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
    const lineEndX = direction === 'left' ? centerX + CIRCLE_RADIUS : centerX - CIRCLE_RADIUS;

    ctx.strokeStyle = color;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lineStartX, centerY);
    ctx.lineTo(lineEndX, centerY);
    ctx.stroke();
  }

  /**
   * 应用阴影
   */
  private applyShadow(ctx: CanvasRenderingContext2D): void {
    ctx.shadowColor = SHADOW.COLOR;
    ctx.shadowBlur = SHADOW.BLUR;
    ctx.shadowOffsetY = SHADOW.OFFSET_Y;
  }

  /**
   * 清除阴影
   */
  private clearShadow(ctx: CanvasRenderingContext2D): void {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ==================== 拖拽预览渲染 ====================

  /**
   * 渲染拖拽预览
   */
  private renderDragPreview(): void {
    if (!this.dragPreview?.isDragging || !this.dragPreview.dragNode) return;

    const dragNode = this.dragPreview.dragNode;
    const ghostPos = this.dragPreview.ghostPosition;

    // 1. 渲染分身节点
    if (ghostPos) {
      this.renderGhostNode(dragNode, ghostPos.x, ghostPos.y);
    }

    // 2. 渲染放置指示器
    if (this.dragPreview.dropTarget && this.dragPreview.dropPosition) {
      this.renderDropIndicator(
        this.dragPreview.dropTarget,
        this.dragPreview.dropPosition
      );
    }
  }

  /**
   * 渲染分身节点
   */
  private renderGhostNode(node: HyyMindMapNode, x: number, y: number): void {
    const ctx = this.offscreenCtx;
    ctx.save();

    ctx.globalAlpha = 0.7;

    const width = node.width;
    const height = node.height;
    const radius = this.theme.borderRadius;

    // 绘制背景
    ctx.fillStyle = this.theme.nodeBackgroundColor;
    this.drawRoundedRect(ctx, x - width / 2, y - height / 2, width, height, radius, true, false);

    // 绘制边框
    ctx.strokeStyle = this.theme.nodeBorderColor;
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, x - width / 2, y - height / 2, width, height, radius, false, true);

    // 绘制文本
    ctx.fillStyle = this.theme.nodeTextColor;
    ctx.font = `${this.theme.fontSize}px ${this.theme.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.text, x, y, width - this.theme.padding * 2);

    ctx.restore();
  }

  /**
   * 渲染放置指示器（预览节点位置和连接线）
   */
  private renderDropIndicator(
    targetNode: HyyMindMapNode,
    position: 'before' | 'after' | 'inside'
  ): void {
    if (!this.dragPreview?.dragNode) return;

    const ctx = this.offscreenCtx;
    ctx.save();

    const indicatorColor = '#FF6B35'; // 橙色
    const dragNode = this.dragPreview.dragNode;
    const nodeWidth = dragNode.width;
    const nodeHeight = dragNode.height;
    const horizontalGap = 100; // 水平间距
    const verticalGap = 20; // 垂直间距

    let previewX: number;
    let previewY: number;
    let lineStartX: number;
    let lineStartY: number;
    let lineEndX: number;
    let lineEndY: number;

    if (position === 'inside') {
      // 放置为子节点
      const result = this.calculateInsidePreviewPosition(
        targetNode,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap
      );
      previewX = result.previewX;
      previewY = result.previewY;
      lineStartX = result.lineStartX;
      lineStartY = result.lineStartY;
      lineEndX = result.lineEndX;
      lineEndY = result.lineEndY;
    } else {
      // before 或 after - 作为同级节点
      const parent = targetNode.parent;
      if (!parent) {
        ctx.restore();
        return;
      }

      const result = this.calculateSiblingPreviewPosition(
        targetNode,
        parent,
        position,
        nodeWidth,
        nodeHeight,
        verticalGap
      );
      previewX = result.previewX;
      previewY = result.previewY;
      lineStartX = result.lineStartX;
      lineStartY = result.lineStartY;
      lineEndX = result.lineEndX;
      lineEndY = result.lineEndY;
    }

    // 1. 绘制预览连接线（贝塞尔曲线）
    this.drawPreviewLine(ctx, lineStartX, lineStartY, lineEndX, lineEndY, indicatorColor);

    // 2. 绘制预览节点框和文本
    this.drawPreviewNode(ctx, previewX, previewY, nodeWidth, nodeHeight, dragNode.text, indicatorColor);

    ctx.restore();
  }

  /**
   * 计算 inside 放置的预览位置
   */
  private calculateInsidePreviewPosition(
    targetNode: HyyMindMapNode,
    nodeWidth: number,
    nodeHeight: number,
    horizontalGap: number,
    verticalGap: number
  ): {
    previewX: number;
    previewY: number;
    lineStartX: number;
    lineStartY: number;
    lineEndX: number;
    lineEndY: number;
  } {
    // 判断方向：根节点根据鼠标位置判断，其他节点根据父节点位置判断
    let direction: 'left' | 'right';
    if (targetNode.parent === null) {
      // 根节点：根据拖拽分身位置判断方向
      const ghostX = this.dragPreview?.ghostPosition?.x ?? targetNode.x;
      direction = ghostX < targetNode.x + targetNode.width / 2 ? 'left' : 'right';
    } else {
      direction = this.getNodeDirection(targetNode);
    }

    let previewX: number;
    let previewY: number;
    let lineStartX: number;
    let lineStartY: number;
    let lineEndX: number;
    let lineEndY: number;

    // 获取目标节点可见的子节点
    const visibleChildren = this.getVisibleChildren(targetNode, direction);

    if (visibleChildren.length === 0) {
      // 没有子节点：在目标节点旁边显示预览
      if (direction === 'right') {
        previewX = targetNode.x + targetNode.width + horizontalGap;
        lineStartX = targetNode.x + targetNode.width;
        lineEndX = previewX;
      } else {
        previewX = targetNode.x - horizontalGap - nodeWidth;
        lineStartX = targetNode.x;
        lineEndX = previewX + nodeWidth;
      }
      previewY = targetNode.y + (targetNode.height - nodeHeight) / 2;
      lineStartY = targetNode.y + targetNode.height / 2;
      lineEndY = previewY + nodeHeight / 2;
    } else {
      // 有子节点：在最后一个子节点下方显示预览
      const lastChild = visibleChildren[visibleChildren.length - 1];
      previewX = lastChild.x;
      previewY = lastChild.y + lastChild.height + verticalGap;

      if (direction === 'right') {
        lineStartX = targetNode.x + targetNode.width;
        lineEndX = previewX;
      } else {
        lineStartX = targetNode.x;
        lineEndX = previewX + nodeWidth;
      }
      lineStartY = targetNode.y + targetNode.height / 2;
      lineEndY = previewY + nodeHeight / 2;
    }

    return { previewX, previewY, lineStartX, lineStartY, lineEndX, lineEndY };
  }

  /**
   * 计算 before/after 放置的预览位置
   */
  private calculateSiblingPreviewPosition(
    targetNode: HyyMindMapNode,
    parent: HyyMindMapNode,
    position: 'before' | 'after',
    nodeWidth: number,
    nodeHeight: number,
    verticalGap: number
  ): {
    previewX: number;
    previewY: number;
    lineStartX: number;
    lineStartY: number;
    lineEndX: number;
    lineEndY: number;
  } {
    const direction = this.getNodeDirection(targetNode);

    // 计算预览节点位置
    const previewX = targetNode.x;
    let previewY: number;
    if (position === 'before') {
      previewY = targetNode.y - verticalGap - nodeHeight;
    } else {
      previewY = targetNode.y + targetNode.height + verticalGap;
    }

    // 连接线从父节点连接到预览位置
    let lineStartX: number;
    let lineEndX: number;
    if (direction === 'right') {
      lineStartX = parent.x + parent.width;
      lineEndX = previewX;
    } else {
      lineStartX = parent.x;
      lineEndX = previewX + nodeWidth;
    }
    const lineStartY = parent.y + parent.height / 2;
    const lineEndY = previewY + nodeHeight / 2;

    return { previewX, previewY, lineStartX, lineStartY, lineEndX, lineEndY };
  }

  /**
   * 获取目标节点在指定方向的可见子节点
   */
  private getVisibleChildren(node: HyyMindMapNode, direction: 'left' | 'right'): HyyMindMapNode[] {
    if (node.children.length === 0) return [];

    // 检查展开状态
    if (node.parent === null) {
      // 根节点：根据方向检查展开状态
      const isExpanded = direction === 'left' ? node.expandedLeft : node.expandedRight;
      if (!isExpanded) return [];

      // 返回指定方向的子节点
      return node.children.filter(child => {
        const childDirection = child.x < node.x ? 'left' : 'right';
        return childDirection === direction;
      });
    } else {
      // 非根节点
      if (!node.expanded) return [];
      return node.children;
    }
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
    color: string
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = this.theme.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([6, 4]); // 虚线

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

    ctx.setLineDash([]); // 重置虚线
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
    color: string
  ): void {
    // 绘制节点框
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = color + '20'; // 带透明度的填充
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    this.drawRoundedRect(ctx, x, y, width, height, this.theme.borderRadius, true, true);

    // 绘制文本
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = color;
    ctx.font = `${this.theme.fontSize}px ${this.theme.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2, width - this.theme.padding * 2);
  }

  /**
   * 获取节点方向（在父节点的哪一侧）
   */
  private getNodeDirection(node: HyyMindMapNode): 'left' | 'right' {
    if (!node.parent) return 'right';
    return node.x < node.parent.x ? 'left' : 'right';
  }

  // ==================== 框选渲染 ====================

  /**
   * 绘制框选矩形
   */
  private renderSelectionRect(): void {
    if (!this.selectionRect) return;

    const ctx = this.offscreenCtx;
    ctx.save();

    const { x, y, width, height } = this.selectionRect;

    ctx.fillStyle = this.theme.selectionRectFillColor;
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = this.theme.selectionRectColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);

    ctx.restore();
  }

  // ==================== 工具方法 ====================

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

  /**
   * 测量文本尺寸
   * @param text 文本内容
   * @param icons 图标
   * @param fontSize 自定义字号（可选）
   */
  public measureText(text: string, icons?: Record<string, string> | string, fontSize?: number): TextMeasurement {
    const actualFontSize = fontSize ?? this.theme.fontSize;
    this.ctx.font = `${actualFontSize}px ${this.theme.fontFamily}`;
    const metrics = this.ctx.measureText(text);

    const padding = this.theme.padding;
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

    return {
      width: metrics.width + iconWidth + padding * 2,
      height: actualFontSize * 1.5 + padding * 2,
    };
  }

  /**
   * 测量表格尺寸
   */
  public measureTable(table: { rows: { content: string }[][] }): TextMeasurement {
    if (!table.rows || table.rows.length === 0) {
      return { width: 100, height: 40 };
    }

    const lineHeight = TABLE.CELL_FONT_SIZE * 1.5;
    this.ctx.font = `${TABLE.CELL_FONT_SIZE}px ${this.theme.fontFamily}`;

    const colCount = table.rows[0]?.length || 0;
    const colWidths: number[] = new Array(colCount).fill(TABLE.MIN_CELL_WIDTH + TABLE.CELL_PADDING_X * 2);

    for (const row of table.rows) {
      row.forEach((cell, colIndex) => {
        const textWidth = this.ctx.measureText(cell.content || ' ').width;
        const cellWidth = Math.min(
          Math.max(textWidth, TABLE.MIN_CELL_WIDTH) + TABLE.CELL_PADDING_X * 2,
          TABLE.MAX_CELL_WIDTH
        );
        colWidths[colIndex] = Math.max(colWidths[colIndex], cellWidth);
      });
    }

    const rowHeights: number[] = [];
    for (const row of table.rows) {
      let maxRowHeight = lineHeight + TABLE.CELL_PADDING_Y * 2;
      row.forEach((cell, colIndex) => {
        const cellContentWidth = colWidths[colIndex] - TABLE.CELL_PADDING_X * 2;
        const textWidth = this.ctx.measureText(cell.content || ' ').width;
        const lineCount = Math.ceil(textWidth / cellContentWidth) || 1;
        const cellHeight = lineCount * lineHeight + TABLE.CELL_PADDING_Y * 2;
        maxRowHeight = Math.max(maxRowHeight, cellHeight);
      });
      rowHeights.push(maxRowHeight);
    }

    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0) + TABLE.BORDER_WIDTH * (colCount + 1);
    const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0) + TABLE.BORDER_WIDTH * (table.rows.length + 1);

    return {
      width: totalWidth + TABLE.MARGIN_LEFT + TABLE.MARGIN_RIGHT + TABLE.NODE_BORDER_WIDTH + TABLE.EXTRA_PADDING,
      height: totalHeight + TABLE.MARGIN_TOP + TABLE.MARGIN_BOTTOM + TABLE.NODE_BORDER_WIDTH,
    };
  }

  /**
   * 测量代码块尺寸
   */
  public measureCodeBlock(codeBlock: { code: string; language: string }): TextMeasurement {
    // 代码块样式参数（与 NodeDOMRenderer 中的样式保持一致）
    const maxWidth = 390; // 最大宽度
    const paddingX = 6; // 水平内边距
    const paddingY = 2; // 垂直内边距
    const marginX = 2; // 外边距
    const codeFontSize = this.theme.fontSize - 2; // calc(1em - 2px)
    
    this.ctx.font = `${codeFontSize}px SourceCodePro, monospace`;
    
    const code = codeBlock.code || '';
    const lines = code.split('\n');
    const lineHeight = codeFontSize * 1.5;
    const contentMaxWidth = maxWidth - paddingX * 2; // 可用内容宽度
    
    let totalLines = 0;
    let maxLineWidth = 0;
    
    // 计算每行的实际宽度，考虑换行
    for (const line of lines) {
      const lineWidth = this.ctx.measureText(line).width;
      maxLineWidth = Math.max(maxLineWidth, lineWidth);
      
      if (lineWidth > contentMaxWidth) {
        // 计算这一行需要换成几行
        const wrappedLines = Math.ceil(lineWidth / contentMaxWidth);
        totalLines += wrappedLines;
      } else {
        totalLines += 1;
      }
    }
    
    // 计算最终宽度：取实际宽度和最大宽度的较小值
    const contentWidth = Math.min(maxLineWidth + paddingX * 2, maxWidth);
    const codeHeight = totalLines * lineHeight;
    
    const nodePadding = this.theme.padding;
    return {
      width: contentWidth + marginX * 2 + nodePadding * 2,
      height: codeHeight + paddingY * 2 + nodePadding * 2,
    };
  }
}
