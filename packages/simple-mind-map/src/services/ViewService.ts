import type { StateManager } from '../core/StateManager';
import type { NodeManager } from '../core/NodeManager';
import { ViewValidator } from '../validators';
import { ZOOM } from '../constants';
import { CoordinateUtils } from '../utils';

export interface ViewPort {
  width: number;
  height: number;
}

export class ViewService {
  constructor(
    private stateManager: StateManager,
    private nodeManager: NodeManager,
    private viewport: ViewPort
  ) {}

  /**
   * 更新视口尺寸
   */
  updateViewport(width: number, height: number): void {
    const validation = ViewValidator.validateContainerSize(width, height);
    if (!validation.valid) {
      console.warn(`[ViewService] Invalid viewport size: ${validation.error}`);
      return;
    }

    this.viewport.width = width;
    this.viewport.height = height;
  }

  /**
   * 设置缩放比例
   */
  setScale(scale: number): void {
    const validation = ViewValidator.validateScale(scale);
    if (!validation.valid) {
      console.warn(`[ViewService] Invalid scale: ${validation.error}`);
      return;
    }

    const viewState = this.stateManager.getViewState();
    const centerX = this.viewport.width / 2;
    const centerY = this.viewport.height / 2;

    const transform = CoordinateUtils.calculateZoomTransform(
      centerX,
      centerY,
      viewState.scale,
      scale,
      viewState.translateX,
      viewState.translateY
    );

    this.stateManager.setViewState({
      scale,
      translateX: transform.translateX,
      translateY: transform.translateY,
    });
  }

  /**
   * 缩放（相对当前比例）
   */
  zoom(delta: number): void {
    const viewState = this.stateManager.getViewState();
    const newScale = Math.max(
      ZOOM.MIN_SCALE,
      Math.min(ZOOM.MAX_SCALE, viewState.scale + delta)
    );
    this.setScale(newScale);
  }

  /**
   * 缩放到指定比例（倍数）
   */
  zoomTo(factor: number): void {
    const viewState = this.stateManager.getViewState();
    const newScale = viewState.scale * factor;
    this.setScale(newScale);
  }

  /**
   * 放大
   */
  zoomIn(): void {
    this.zoom(ZOOM.STEP);
  }

  /**
   * 缩小
   */
  zoomOut(): void {
    this.zoom(-ZOOM.STEP);
  }

  /**
   * 重置缩放
   */
  zoomReset(): void {
    this.setScale(1);
  }

  /**
   * 平移视图
   */
  translate(deltaX: number, deltaY: number): void {
    const viewState = this.stateManager.getViewState();
    const newTranslateX = viewState.translateX + deltaX;
    const newTranslateY = viewState.translateY + deltaY;

    const validation = ViewValidator.validateTranslate(newTranslateX, newTranslateY);
    if (!validation.valid) {
      console.warn(`[ViewService] Invalid translate: ${validation.error}`);
      return;
    }

    this.stateManager.setTranslate(newTranslateX, newTranslateY);
  }

  /**
   * 回到根节点（将根节点居中显示）
   */
  centerOnRoot(): void {
    const root = this.nodeManager.getRoot();
    if (!root) return;

    const viewState = this.stateManager.getViewState();
    const canvasCenterX = this.viewport.width / 2;
    const canvasCenterY = this.viewport.height / 2;

    const rootCenterX = root.x + root.width / 2;
    const rootCenterY = root.y + root.height / 2;

    const translateX = canvasCenterX - rootCenterX * viewState.scale;
    const translateY = canvasCenterY - rootCenterY * viewState.scale;

    this.stateManager.setTranslate(translateX, translateY);
  }

  /**
   * 将指定节点居中显示
   */
  centerOnNode(nodeId: string): void {
    const node = this.nodeManager.findNode(nodeId);
    if (!node) {
      console.warn(`[ViewService] Node not found: ${nodeId}`);
      return;
    }

    const viewState = this.stateManager.getViewState();
    const canvasCenterX = this.viewport.width / 2;
    const canvasCenterY = this.viewport.height / 2;

    const nodeCenterX = node.x + node.width / 2;
    const nodeCenterY = node.y + node.height / 2;

    const translateX = canvasCenterX - nodeCenterX * viewState.scale;
    const translateY = canvasCenterY - nodeCenterY * viewState.scale;

    this.stateManager.setTranslate(translateX, translateY);
  }

  /**
   * 自适应画布（让所有内容可见）
   */
  fitToContent(): void {
    const root = this.nodeManager.getRoot();
    if (!root) return;

    // 计算所有节点的边界
    const bounds = this.calculateContentBounds();
    if (!bounds) return;

    const padding = 50; // 边距
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    const scaleX = (this.viewport.width - padding * 2) / contentWidth;
    const scaleY = (this.viewport.height - padding * 2) / contentHeight;
    const scale = Math.min(scaleX, scaleY, ZOOM.MAX_SCALE);

    // 计算居中位置
    const contentCenterX = (bounds.minX + bounds.maxX) / 2;
    const contentCenterY = (bounds.minY + bounds.maxY) / 2;

    const translateX = this.viewport.width / 2 - contentCenterX * scale;
    const translateY = this.viewport.height / 2 - contentCenterY * scale;

    this.stateManager.setViewState({
      scale,
      translateX,
      translateY,
    });
  }

  /**
   * 获取当前缩放比例
   */
  getScale(): number {
    return this.stateManager.getViewState().scale;
  }

  /**
   * 获取当前平移量
   */
  getTranslate(): { x: number; y: number } {
    const viewState = this.stateManager.getViewState();
    return {
      x: viewState.translateX,
      y: viewState.translateY,
    };
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 计算内容边界
   */
  private calculateContentBounds(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null {
    const nodes = this.nodeManager.getAllNodes();
    if (nodes.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    return { minX, minY, maxX, maxY };
  }
}
