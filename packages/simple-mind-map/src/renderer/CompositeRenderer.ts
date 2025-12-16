import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { Theme, Rect, DragPreviewState, TextMeasurement } from '../types';
import type { IRenderer } from '../types/interfaces';
import {
  LineRenderer,
  NodeShapeRenderer,
  NodeContentRenderer,
  IndicatorRenderer,
  SelectionRenderer,
  DragPreviewRenderer,
} from './strategies';
import { DEFAULT_THEME } from '../constants/theme';
import { ICON, TABLE } from '../constants';

export interface CompositeRendererOptions {
  theme?: Partial<Theme>;
  useDOMNodes?: boolean;
}

/**
 * CompositeRenderer - 新的主渲染器
 */
export class CompositeRenderer implements IRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private theme: Theme;

  // 离屏Canvas（性能优化）
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  // 变换状态
  private scale = 1;
  private translateX = 0;
  private translateY = 0;

  // 框选矩形
  private selectionRect: Rect | null = null;

  // 拖拽预览状态
  private dragPreview: DragPreviewState | null = null;

  // 是否使用 DOM 渲染节点
  private useDOMNodes: boolean = false;

  // 渲染策略组合
  private lineRenderer: LineRenderer;
  private nodeShapeRenderer: NodeShapeRenderer;
  private nodeContentRenderer: NodeContentRenderer;
  private indicatorRenderer: IndicatorRenderer;
  private selectionRenderer: SelectionRenderer;
  private dragPreviewRenderer: DragPreviewRenderer;

  // 当前渲染的根节点
  private currentRoot: HyyMindMapNode | null = null;

  constructor(canvas: HTMLCanvasElement, options?: CompositeRendererOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.theme = { ...DEFAULT_THEME, ...options?.theme };
    this.useDOMNodes = options?.useDOMNodes ?? false;

    // 创建离屏Canvas
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = canvas.width;
    this.offscreenCanvas.height = canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

    // 初始化渲染策略
    this.lineRenderer = new LineRenderer();
    this.nodeShapeRenderer = new NodeShapeRenderer();
    this.nodeContentRenderer = new NodeContentRenderer();
    this.indicatorRenderer = new IndicatorRenderer();
    this.selectionRenderer = new SelectionRenderer();
    this.dragPreviewRenderer = new DragPreviewRenderer();

    // 设置图标加载回调
    this.nodeContentRenderer.setIconLoadedCallback(() => {
      if (this.currentRoot) {
        this.render(this.currentRoot);
      }
    });
  }

  /**
   * 设置变换
   */
  setTransform(scale: number, translateX: number, translateY: number): void {
    this.scale = scale;
    this.translateX = translateX;
    this.translateY = translateY;
  }

  /**
   * 设置框选矩形
   */
  setSelectionRect(rect: Rect | null): void {
    this.selectionRect = rect;
  }

  /**
   * 设置拖拽预览
   */
  setDragPreview(dragPreview: DragPreviewState | null): void {
    this.dragPreview = dragPreview;
  }

  /**
   * 主渲染方法 - 使用组合模式
   */
  render(root: HyyMindMapNode | null): void {
    if (!root) return;

    this.currentRoot = root;
    const dpr = window.devicePixelRatio || 1;

    // 1. 清空离屏Canvas
    this.clearCanvas(this.offscreenCtx, dpr);

    // 2. 应用变换
    this.applyTransform(this.offscreenCtx);

    // 3. 渲染连线（递归渲染所有可见连线）
    this.renderLinesRecursive(root);

    // 4. 渲染节点（如果不是 DOM 渲染模式）
    if (!this.useDOMNodes) {
      this.renderNodesRecursive(root);
    }

    // 5. 渲染拖拽预览
    if (this.dragPreview?.isDragging) {
      this.dragPreviewRenderer.render(this.offscreenCtx, this.dragPreview, this.theme);
    }

    // 6. 渲染框选矩形
    if (this.selectionRect) {
      this.selectionRenderer.render(this.offscreenCtx, this.selectionRect, this.theme);
    }

    // 7. 复制到主Canvas
    this.copyToMainCanvas(dpr);
  }

  /**
   * 递归渲染连线
   */
  private renderLinesRecursive(node: HyyMindMapNode): void {
    // 渲染当前节点的连线
    this.lineRenderer.render(this.offscreenCtx, node, this.theme);

    // 递归渲染子节点的连线
    if (this.shouldNodeExpand(node)) {
      for (const child of node.children) {
        if (this.shouldChildBeVisible(node, child)) {
          this.renderLinesRecursive(child);
        }
      }
    }
  }

  /**
   * 递归渲染节点
   */
  private renderNodesRecursive(node: HyyMindMapNode): void {
    // 渲染节点形状
    this.nodeShapeRenderer.render(this.offscreenCtx, node, this.theme);

    // 渲染节点内容
    this.nodeContentRenderer.render(this.offscreenCtx, node, this.theme);

    // 渲染展开指示器
    this.indicatorRenderer.render(this.offscreenCtx, node, this.theme);

    // 递归渲染子节点
    if (this.shouldNodeExpand(node)) {
      for (const child of node.children) {
        if (this.shouldChildBeVisible(node, child)) {
          this.renderNodesRecursive(child);
        }
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
    // 检查canvas尺寸是否有效
    if (this.offscreenCanvas.width === 0 || this.offscreenCanvas.height === 0) {
      return; // 跳过绘制
    }

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.ctx.fillStyle = this.theme.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  /**
   * 更新离屏Canvas尺寸
   */
  updateOffscreenCanvas(): void {
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
  }

  /**
   * 测量文本尺寸
   */
  measureText(text: string, icons?: Record<string, string> | string, fontSize?: number): TextMeasurement {
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
  measureTable(table: { rows: { content: string }[][] }): TextMeasurement {
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
  measureCodeBlock(codeBlock: { code: string; language: string }): TextMeasurement {
    const maxWidth = 390;
    const paddingX = 6;
    const paddingY = 2;
    const marginX = 2;
    const codeFontSize = this.theme.fontSize - 2;

    this.ctx.font = `${codeFontSize}px SourceCodePro, monospace`;

    const code = codeBlock.code || '';
    const lines = code.split('\n');
    const lineHeight = codeFontSize * 1.5;
    const contentMaxWidth = maxWidth - paddingX * 2;

    let totalLines = 0;
    let maxLineWidth = 0;

    for (const line of lines) {
      const lineWidth = this.ctx.measureText(line).width;
      maxLineWidth = Math.max(maxLineWidth, lineWidth);

      if (lineWidth > contentMaxWidth) {
        const wrappedLines = Math.ceil(lineWidth / contentMaxWidth);
        totalLines += wrappedLines;
      } else {
        totalLines += 1;
      }
    }

    const contentWidth = Math.min(maxLineWidth + paddingX * 2, maxWidth);
    const codeHeight = totalLines * lineHeight;

    const nodePadding = this.theme.padding;
    return {
      width: contentWidth + marginX * 2 + nodePadding * 2,
      height: codeHeight + paddingY * 2 + nodePadding * 2,
    };
  }

  /**
   * 清除图标缓存
   */
  clearIconCache(): void {
    this.nodeContentRenderer.clearIconCache();
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.clearIconCache();
    this.currentRoot = null;
    this.selectionRect = null;
    this.dragPreview = null;
  }
}
