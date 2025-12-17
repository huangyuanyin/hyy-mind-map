import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { ImageData, ViewState } from '../types';

/**
 * 图片尺寸更新回调
 */
export type ImageResizeCallback = (nodeId: string, imageData: ImageData) => void;

/**
 * 调整手柄位置类型
 */
export type ResizeHandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/**
 * 图片调整状态
 */
interface ImageResizeState {
  isResizing: boolean;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  handlePosition: ResizeHandlePosition;
  aspectRatio: number;
  ghostElement: HTMLElement | null;
}

/**
 * 图片选中状态变化回调
 */
export type ImageSelectCallback = (nodeId: string | null) => void;

/**
 * 图片双击查看原图回调
 */
export type ImagePreviewCallback = (imageData: ImageData) => void;

/**
 * 图片调整处理器配置
 */
export interface ImageResizeHandlerConfig {
  /** 获取当前视图状态 */
  getViewState: () => ViewState;
  /** 获取节点数据缓存 */
  getNodeDataCache: () => Map<string, HyyMindMapNode>;
  /** 图片尺寸更新回调 */
  onImageResize?: ImageResizeCallback;
  /** 图片选中状态变化回调 */
  onImageSelect?: ImageSelectCallback;
  /** 图片双击查看原图回调 */
  onImagePreview?: ImagePreviewCallback;
}

/**
 * 图片调整处理器
 * 负责处理节点图片的选中、调整大小等交互逻辑
 */
export class ImageResizeHandler {
  private config: ImageResizeHandlerConfig;

  // 当前选中的图片容器
  private selectedImageContainer: HTMLElement | null = null;
  // 当前选中图片所属的节点 ID
  private selectedImageNodeId: string | null = null;
  // 图片调整状态
  private imageResizeState: ImageResizeState | null = null;

  constructor(config: ImageResizeHandlerConfig) {
    this.config = config;
  }

  /**
   * 设置图片尺寸更新回调
   */
  public setImageResizeCallback(callback: ImageResizeCallback): void {
    this.config.onImageResize = callback;
  }

  /**
   * 获取当前选中的图片节点 ID
   */
  public getSelectedImageNodeId(): string | null {
    return this.selectedImageNodeId;
  }

  /**
   * 设置图片预览回调
   */
  public setImagePreviewCallback(callback: ImagePreviewCallback): void {
    this.config.onImagePreview = callback;
  }

  /**
   * 绑定图片点击事件
   */
  public bindImageClickEvents(
    wrapper: HTMLElement,
    nodeId: string,
    imageData: ImageData
  ): void {
    wrapper.addEventListener('click', (e) => {
      // 检查节点是否被选中
      const node = this.config.getNodeDataCache().get(nodeId);
      if (!node?.isSelected && !node?.isActive) {
        return;
      }

      // 节点已选中时，阻止事件冒泡，避免触发节点编辑
      e.stopPropagation();

      // 如果点击的是调整手柄，不处理
      if ((e.target as HTMLElement).classList.contains('image-resize-handle')) {
        return;
      }

      this.selectImage(wrapper, nodeId, imageData);
    });

    // 双击查看原图
    wrapper.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();

      if ((e.target as HTMLElement).classList.contains('image-resize-handle')) {
        return;
      }

      if (this.config.onImagePreview) {
        this.config.onImagePreview(imageData);
      }
    });

    // 只有当节点已选中时才阻止 mousedown 事件冒泡
    wrapper.addEventListener('mousedown', (e) => {
      const node = this.config.getNodeDataCache().get(nodeId);
      if (node?.isSelected || node?.isActive) {
        e.stopPropagation();
      }
    });
  }

  /**
   * 选中图片
   */
  private selectImage(
    wrapper: HTMLElement,
    nodeId: string,
    imageData: ImageData
  ): void {
    this.clearImageSelection();

    // 设置新的选中
    this.selectedImageContainer = wrapper;
    this.selectedImageNodeId = nodeId;

    this.showImageResizeHandles(wrapper, nodeId, imageData);

    // 添加全局点击监听器，点击其他地方时取消选中
    this.addGlobalClickListener();

    // 通知外部图片被选中
    this.config.onImageSelect?.(nodeId);
  }

  /**
   * 清除图片选中状态
   */
  public clearImageSelection(): void {
    const hadSelection = this.selectedImageNodeId !== null;

    if (this.selectedImageContainer) {
      // 移除所有调整手柄
      const handles = this.selectedImageContainer.querySelectorAll('.image-resize-handle');
      handles.forEach(handle => handle.remove());

      // 移除选中边框
      this.selectedImageContainer.classList.remove('image-selected');
      const img = this.selectedImageContainer.querySelector('.node-image') as HTMLElement;
      if (img) {
        img.style.outline = 'none';
      }
    }

    this.selectedImageContainer = null;
    this.selectedImageNodeId = null;
    this.removeGlobalClickListener();

    // 通知外部图片取消选中
    if (hadSelection) {
      this.config.onImageSelect?.(null);
    }
  }

  /**
   * 显示图片调整手柄
   */
  public showImageResizeHandles(
    wrapper: HTMLElement,
    nodeId: string,
    imageData: ImageData
  ): void {
    // 更新选中的图片容器引用（重要：当图片重新渲染后，需要更新引用）
    this.selectedImageContainer = wrapper;
    this.selectedImageNodeId = nodeId;

    wrapper.classList.add('image-selected');
    const img = wrapper.querySelector('.node-image') as HTMLElement;
    if (img) {
      img.style.outline = '2px solid #1890ff';
    }

    // 8个调整手柄的位置
    const handlePositions: ResizeHandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

    handlePositions.forEach(position => {
      const handle = this.createResizeHandle(position, nodeId, imageData);
      wrapper.appendChild(handle);
    });
  }

  /**
   * 创建单个调整手柄
   */
  private createResizeHandle(
    position: ResizeHandlePosition,
    nodeId: string,
    imageData: ImageData
  ): HTMLElement {
    const handle = document.createElement('div');
    handle.className = `image-resize-handle image-resize-handle-${position}`;

    // 手柄样式
    const baseStyle = `
      position: absolute;
      width: 8px;
      height: 8px;
      background-color: #fff;
      border: 1px solid #1890ff;
      border-radius: 50%;
      z-index: 10;
    `;

    // 根据位置设置定位和光标样式
    let positionStyle = '';
    let cursor = '';

    switch (position) {
      case 'nw':
        positionStyle = 'top: -4px; left: -4px;';
        cursor = 'nw-resize';
        break;
      case 'n':
        positionStyle = 'top: -4px; left: 50%; transform: translateX(-50%);';
        cursor = 'n-resize';
        break;
      case 'ne':
        positionStyle = 'top: -4px; right: -4px;';
        cursor = 'ne-resize';
        break;
      case 'e':
        positionStyle = 'top: 50%; right: -4px; transform: translateY(-50%);';
        cursor = 'e-resize';
        break;
      case 'se':
        positionStyle = 'bottom: -4px; right: -4px;';
        cursor = 'se-resize';
        break;
      case 's':
        positionStyle = 'bottom: -4px; left: 50%; transform: translateX(-50%);';
        cursor = 's-resize';
        break;
      case 'sw':
        positionStyle = 'bottom: -4px; left: -4px;';
        cursor = 'sw-resize';
        break;
      case 'w':
        positionStyle = 'top: 50%; left: -4px; transform: translateY(-50%);';
        cursor = 'w-resize';
        break;
    }

    handle.style.cssText = `${baseStyle}${positionStyle}cursor: ${cursor};`;

    this.bindResizeHandleEvents(handle, position, nodeId, imageData);

    return handle;
  }

  /**
   * 绑定调整手柄拖拽事件
   */
  private bindResizeHandleEvents(
    handle: HTMLElement,
    position: ResizeHandlePosition,
    _nodeId: string,
    imageData: ImageData
  ): void {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const img = this.selectedImageContainer?.querySelector('.node-image') as HTMLImageElement;
      if (!img || !this.selectedImageContainer) return;

      const rect = img.getBoundingClientRect();
      const scale = this.config.getViewState().scale || 1;

      // 使用原始图片尺寸计算宽高比，确保一致性
      const originalWidth = imageData.width || img.naturalWidth || 1;
      const originalHeight = imageData.height || img.naturalHeight || 1;

      // 创建拖拽预览图
      const ghostElement = this.createResizeGhost(img);
      this.selectedImageContainer.appendChild(ghostElement);

      // 初始化调整状态
      this.imageResizeState = {
        isResizing: true,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width / scale,
        startHeight: rect.height / scale,
        handlePosition: position,
        aspectRatio: originalHeight / originalWidth,
        ghostElement,
      };

      // 移除全局点击监听器，避免干扰拖拽
      this.removeGlobalClickListener();

      document.addEventListener('mousemove', this.handleImageResizeMove);
      document.addEventListener('mouseup', this.handleImageResizeEnd);

      document.body.style.cursor = handle.style.cursor;
      document.body.style.userSelect = 'none';
    });
  }

  /**
   * 创建拖拽预览图
   */
  private createResizeGhost(img: HTMLImageElement): HTMLElement {
    const ghost = document.createElement('div');
    ghost.className = 'image-resize-ghost';
    ghost.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${img.style.width};
      height: auto;
      background-image: url(${img.src});
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      border: 2px dashed #1890ff;
      border-radius: 4px;
      opacity: 0.6;
      pointer-events: none;
      z-index: 10;
      box-sizing: border-box;
    `;
    return ghost;
  }

  /**
   * 处理图片调整移动
   */
  private handleImageResizeMove = (e: MouseEvent): void => {
    if (!this.imageResizeState || !this.selectedImageContainer || !this.selectedImageNodeId) {
      return;
    }

    const { startX, startY, startWidth, startHeight, handlePosition, aspectRatio, ghostElement } = this.imageResizeState;
    if (!ghostElement) return;

    const scale = this.config.getViewState().scale || 1;

    // 计算鼠标移动距离（考虑缩放）
    const deltaX = (e.clientX - startX) / scale;
    const deltaY = (e.clientY - startY) / scale;

    let newWidth = startWidth;
    let offsetX = 0;  // ghost 的左偏移
    let offsetY = 0;  // ghost 的上偏移

    // 根据手柄位置计算新宽度，同时计算 ghost 的位置偏移，使其看起来从正确的方向扩展
    switch (handlePosition) {
      case 'e':
        // 右边：向右拖拽增大，从右侧扩展
        newWidth = startWidth + deltaX;
        break;
      case 'w':
        newWidth = startWidth - deltaX;
        offsetX = deltaX;  // 向左移动 ghost
        break;
      case 'n':
        newWidth = startWidth - deltaY / aspectRatio;
        offsetY = deltaY;  // 向上移动 ghost
        break;
      case 's':
        newWidth = startWidth + deltaY / aspectRatio;
        break;
      case 'se':
        newWidth = startWidth + (deltaX + deltaY / aspectRatio) / 2;
        break;
      case 'sw':
        newWidth = startWidth + (-deltaX + deltaY / aspectRatio) / 2;
        offsetX = startWidth - newWidth;  // 宽度变化量决定左偏移
        break;
      case 'ne':
        newWidth = startWidth + (deltaX - deltaY / aspectRatio) / 2;
        offsetY = startHeight - newWidth * aspectRatio;  // 高度变化量决定上偏移
        break;
      case 'nw':
        newWidth = startWidth + (-deltaX - deltaY / aspectRatio) / 2;
        offsetX = startWidth - newWidth;  // 宽度变化量决定左偏移
        offsetY = startHeight - newWidth * aspectRatio;  // 高度变化量决定上偏移
        break;
    }

    // 限制最小和最大尺寸
    const minWidth = 50;
    const maxWidth = 800;
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

    // 如果尺寸被限制了，需要重新计算偏移
    if (clampedWidth !== newWidth) {
      const widthDiff = clampedWidth - newWidth;
      // 根据手柄位置调整偏移
      if (handlePosition === 'w' || handlePosition === 'sw' || handlePosition === 'nw') {
        offsetX -= widthDiff;
      }
      if (handlePosition === 'n' || handlePosition === 'ne' || handlePosition === 'nw') {
        offsetY -= widthDiff * aspectRatio;
      }
      newWidth = clampedWidth;
    }

    // 计算新高度（保持宽高比）
    const newHeight = newWidth * aspectRatio;

    // 更新预览图（ghost）尺寸和位置
    ghostElement.style.width = `${newWidth}px`;
    ghostElement.style.height = `${newHeight}px`;
    ghostElement.style.left = `${offsetX}px`;
    ghostElement.style.top = `${offsetY}px`;
  };

  /**
   * 处理图片调整结束
   */
  private handleImageResizeEnd = (): void => {
    if (!this.imageResizeState || !this.selectedImageContainer || !this.selectedImageNodeId) {
      this.cleanupResize();
      return;
    }

    const { ghostElement, aspectRatio } = this.imageResizeState;

    // 从预览图获取最终尺寸
    let finalWidth: number;
    if (ghostElement) {
      finalWidth = parseInt(ghostElement.style.width) || this.imageResizeState.startWidth;
      ghostElement.remove();
    } else {
      finalWidth = this.imageResizeState.startWidth;
    }

    const finalHeight = Math.floor(finalWidth * aspectRatio);

    // 获取节点的 imageData
    const node = this.config.getNodeDataCache().get(this.selectedImageNodeId);
    if (node?.config?.image && this.config.onImageResize) {
      const updatedImageData: ImageData = {
        ...node.config.image,
        displayWidth: finalWidth,
        displayHeight: finalHeight,
      };
      this.config.onImageResize(this.selectedImageNodeId, updatedImageData);
    }

    this.cleanupResize();
  };

  /**
   * 清理调整状态
   */
  private cleanupResize(): void {
    if (this.imageResizeState?.ghostElement) {
      this.imageResizeState.ghostElement.remove();
    }

    document.removeEventListener('mousemove', this.handleImageResizeMove);
    document.removeEventListener('mouseup', this.handleImageResizeEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    this.imageResizeState = null;

    if (this.selectedImageContainer) {
      setTimeout(() => {
        this.addGlobalClickListener();
      }, 100);
    }
  }

  /**
   * 添加全局点击监听器
   */
  private addGlobalClickListener(): void {
    setTimeout(() => {
      document.addEventListener('click', this.handleGlobalClick);
    }, 0);
  }

  /**
   * 移除全局点击监听器
   */
  private removeGlobalClickListener(): void {
    document.removeEventListener('click', this.handleGlobalClick);
  }

  /**
   * 处理全局点击（取消图片选中）
   */
  private handleGlobalClick = (e: MouseEvent): void => {
    if (this.selectedImageContainer?.contains(e.target as Node)) {
      return;
    }

    this.clearImageSelection();
  };

  /**
   * 销毁处理器，清理所有事件监听
   */
  public destroy(): void {
    this.clearImageSelection();
    this.removeGlobalClickListener();
    document.removeEventListener('mousemove', this.handleImageResizeMove);
    document.removeEventListener('mouseup', this.handleImageResizeEnd);
  }
}

