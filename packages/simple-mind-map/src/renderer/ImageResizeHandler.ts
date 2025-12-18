import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { ImageData, ViewState, ImagePosition } from '../types';

/**
 * 图片尺寸更新回调
 */
export type ImageResizeCallback = (nodeId: string, imageData: ImageData) => void;

/**
 * 图片位置更新回调
 */
export type ImagePositionCallback = (nodeId: string, position: ImagePosition) => void;

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
 * 图片拖拽状态
 */
interface ImageDragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  ghostElement: HTMLElement | null;
  /** 上方位置指示器 */
  aboveIndicator: HTMLElement | null;
  /** 下方位置指示器 */
  belowIndicator: HTMLElement | null;
  /** 左侧位置指示器 */
  leftIndicator: HTMLElement | null;
  /** 右侧位置指示器 */
  rightIndicator: HTMLElement | null;
  /** 橙色主边框 */
  borderOverlay: HTMLElement | null;
  /** 左侧垂直分隔线 */
  leftDivider: HTMLElement | null;
  /** 右侧垂直分隔线 */
  rightDivider: HTMLElement | null;
  /** 中间水平分隔线 */
  middleDivider: HTMLElement | null;
  /** 当前选择的位置（根据拖拽方向） */
  hoverPosition: ImagePosition | null;
  /** 节点元素引用，用于清理 */
  nodeElement: HTMLElement | null;
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
  /** 图片位置更新回调 */
  onImagePosition?: ImagePositionCallback;
  /** 图片选中状态变化回调 */
  onImageSelect?: ImageSelectCallback;
  /** 图片双击查看原图回调 */
  onImagePreview?: ImagePreviewCallback;
}

/** 拖拽阈值 */
const DRAG_THRESHOLD = 5;

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
  // 图片拖拽状态
  private imageDragState: ImageDragState | null = null;
  // 是否正在拖拽
  private isDraggingImage: boolean = false;

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
   * 设置图片位置更新回调
   */
  public setImagePositionCallback(callback: ImagePositionCallback): void {
    this.config.onImagePosition = callback;
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
    wrapper.style.cursor = 'pointer';

    // 禁用图片的默认拖拽行为
    const img = wrapper.querySelector('.node-image') as HTMLImageElement;
    if (img) {
      img.draggable = false;
      img.addEventListener('dragstart', (e) => {
        e.preventDefault();
        return false;
      });
    }

    // 记录 mousedown 时节点是否已选中
    let wasNodeSelectedOnMouseDown = false;

    wrapper.addEventListener('mousedown', (e) => {
      const node = this.config.getNodeDataCache().get(nodeId);
      // 记录当前节点的选中状态
      wasNodeSelectedOnMouseDown = !!(node?.isSelected || node?.isActive);

      if ((e.target as HTMLElement).classList.contains('image-resize-handle')) {
        return;
      }

      // 只有图片被选中时才允许拖拽
      if (this.selectedImageNodeId === nodeId) {
        e.preventDefault();
        e.stopPropagation();
        this.startDragDetection(e, wrapper, nodeId, imageData);
      } else if (wasNodeSelectedOnMouseDown) {
        // 节点已选中但图片未选中时，阻止冒泡避免触发节点编辑
        e.stopPropagation();
      }
    });

    wrapper.addEventListener('click', (e) => {
      // 只有在 mousedown 时节点就已选中，才能选中图片
      if (!wasNodeSelectedOnMouseDown) {
        return;
      }

      // 阻止事件冒泡，避免触发节点编辑
      e.stopPropagation();

      // 如果刚刚完成拖拽，不处理 click 事件
      if (this.isDraggingImage) {
        return;
      }

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
  }

  /**
   * 启动拖拽检测
   */
  private startDragDetection(
    e: MouseEvent,
    wrapper: HTMLElement,
    nodeId: string,
    _imageData: ImageData
  ): void {
    if (this.imageDragState) {
      this.cleanupDrag();
    }

    // 找到节点元素
    const nodeElement = wrapper.closest('.mind-map-node') as HTMLElement;
    if (!nodeElement) {
      return;
    }

    // 清理 body 上可能残留的旧指示器、边框和分隔线
    document.body.querySelectorAll(
      '.image-position-overlay, .image-position-border-overlay, .image-position-divider-left, .image-position-divider-right, .image-position-divider-middle'
    ).forEach(el => el.remove());

    const startX = e.clientX;
    const startY = e.clientY;
    let isDragStarted = false;

    // 创建边框和指示器
    const createIndicators = () => {
      const nodeRect = nodeElement.getBoundingClientRect();

      // 获取节点的 border-radius，确保边框和节点匹配
      const nodeComputedStyle = window.getComputedStyle(nodeElement);
      const nodeBorderRadius = nodeComputedStyle.borderRadius || '8px';

      // 创建主边框（覆盖整个节点）
      const borderWidth = 2;
      const borderOverlay = document.createElement('div');
      borderOverlay.className = 'image-position-border-overlay';
      borderOverlay.style.cssText = `
        position: fixed;
        left: ${nodeRect.left - borderWidth}px;
        top: ${nodeRect.top - borderWidth}px;
        width: ${nodeRect.width}px;
        height: ${nodeRect.height}px;
        border: ${borderWidth}px solid #ff7a45;
        border-radius: ${nodeBorderRadius};
        pointer-events: none;
        z-index: 999999;
        box-sizing: content-box;
      `;
      document.body.appendChild(borderOverlay);

      // 创建四个方向的遮罩（不带边框，只有背景色）
      const createOverlay = (position: ImagePosition): HTMLElement => {
      const overlay = document.createElement('div');
      overlay.className = `image-position-overlay image-position-overlay-${position}`;

      let left = nodeRect.left;
      let top = nodeRect.top;
      let width = nodeRect.width;
      let height = nodeRect.height;

      // 将宽度分为三份，高度分为两份
      const thirdWidth = nodeRect.width / 3;
      const halfHeight = nodeRect.height / 2;

      switch (position) {
        case 'left':
          // 左侧：完整高度，1/3 宽度
          width = thirdWidth;
          break;
        case 'above':
          // 中间上部分：中间 1/3 宽度，上半高度
          left = nodeRect.left + thirdWidth;
          width = thirdWidth;
          height = halfHeight;
          break;
        case 'below':
          // 中间下部分：中间 1/3 宽度，下半高度
          left = nodeRect.left + thirdWidth;
          top = nodeRect.top + halfHeight;
          width = thirdWidth;
          height = halfHeight;
          break;
        case 'right':
          // 右侧：完整高度，1/3 宽度
          left = nodeRect.left + thirdWidth * 2;
          width = thirdWidth;
          break;
      }

      overlay.style.setProperty('position', 'fixed', 'important');
      overlay.style.setProperty('left', `${left}px`, 'important');
      overlay.style.setProperty('top', `${top}px`, 'important');
      overlay.style.setProperty('width', `${width}px`, 'important');
      overlay.style.setProperty('height', `${height}px`, 'important');
      overlay.style.setProperty('background-color', 'rgba(255, 122, 69, 0.1)', 'important');
      overlay.style.setProperty('pointer-events', 'none', 'important');
      overlay.style.setProperty('z-index', '999998', 'important');
      overlay.style.setProperty('transition', 'background-color 0.2s ease-out', 'important');
      overlay.style.setProperty('box-sizing', 'border-box', 'important');

        return overlay;
      };

      // 创建四个方向的遮罩（只有背景色）
      const aboveIndicator = createOverlay('above');
      const belowIndicator = createOverlay('below');
      const leftIndicator = createOverlay('left');
      const rightIndicator = createOverlay('right');

      // 创建分隔线
      const thirdWidth = nodeRect.width / 3;
      const halfHeight = nodeRect.height / 2;

      // 左侧垂直分隔线
      const leftDivider = document.createElement('div');
      leftDivider.className = 'image-position-divider-left';
      leftDivider.style.cssText = `
        position: fixed;
        left: ${nodeRect.left + thirdWidth}px;
        top: ${nodeRect.top}px;
        width: 2px;
        height: ${nodeRect.height}px;
        background-color: #ff7a45;
        pointer-events: none;
        z-index: 999999;
      `;

      // 右侧垂直分隔线
      const rightDivider = document.createElement('div');
      rightDivider.className = 'image-position-divider-right';
      rightDivider.style.cssText = `
        position: fixed;
        left: ${nodeRect.left + thirdWidth * 2}px;
        top: ${nodeRect.top}px;
        width: 2px;
        height: ${nodeRect.height}px;
        background-color: #ff7a45;
        pointer-events: none;
        z-index: 999999;
      `;

      // 中间水平分隔线
      const middleDivider = document.createElement('div');
      middleDivider.className = 'image-position-divider-middle';
      middleDivider.style.cssText = `
        position: fixed;
        left: ${nodeRect.left + thirdWidth}px;
        top: ${nodeRect.top + halfHeight}px;
        width: ${thirdWidth}px;
        height: 2px;
        background-color: #ff7a45;
        pointer-events: none;
        z-index: 999999;
      `;

      // 添加遮罩和分隔线到 body
      [aboveIndicator, belowIndicator, leftIndicator, rightIndicator, leftDivider, rightDivider, middleDivider].forEach(
        el => document.body.appendChild(el)
      );

      return {
        borderOverlay,
        aboveIndicator,
        belowIndicator,
        leftIndicator,
        rightIndicator,
        leftDivider,
        rightDivider,
        middleDivider,
      };
    };

    // 初始化拖拽状态
    this.imageDragState = {
      isDragging: false,
      startX,
      startY,
      ghostElement: null,
      aboveIndicator: null,
      belowIndicator: null,
      leftIndicator: null,
      rightIndicator: null,
      borderOverlay: null,
      leftDivider: null,
      rightDivider: null,
      middleDivider: null,
      hoverPosition: null,
      nodeElement,
    };

    // 更新所有元素的位置和尺寸
    const updatePositions = () => {
      if (!this.imageDragState || !nodeElement) return;

      // 重新获取节点的实际位置和尺寸
      const currentRect = nodeElement.getBoundingClientRect();
      const thirdWidth = currentRect.width / 3;
      const halfHeight = currentRect.height / 2;
      const borderWidth = 2;

      // 更新主边框（需要偏移以完全包围节点）
      if (this.imageDragState.borderOverlay) {
        this.imageDragState.borderOverlay.style.left = `${currentRect.left - borderWidth}px`;
        this.imageDragState.borderOverlay.style.top = `${currentRect.top - borderWidth}px`;
        this.imageDragState.borderOverlay.style.width = `${currentRect.width}px`;
        this.imageDragState.borderOverlay.style.height = `${currentRect.height}px`;
      }

      // 更新左侧指示器
      if (this.imageDragState.leftIndicator) {
        this.imageDragState.leftIndicator.style.left = `${currentRect.left}px`;
        this.imageDragState.leftIndicator.style.top = `${currentRect.top}px`;
        this.imageDragState.leftIndicator.style.width = `${thirdWidth}px`;
        this.imageDragState.leftIndicator.style.height = `${currentRect.height}px`;
      }

      // 更新上方指示器
      if (this.imageDragState.aboveIndicator) {
        this.imageDragState.aboveIndicator.style.left = `${currentRect.left + thirdWidth}px`;
        this.imageDragState.aboveIndicator.style.top = `${currentRect.top}px`;
        this.imageDragState.aboveIndicator.style.width = `${thirdWidth}px`;
        this.imageDragState.aboveIndicator.style.height = `${halfHeight}px`;
      }

      // 更新下方指示器
      if (this.imageDragState.belowIndicator) {
        this.imageDragState.belowIndicator.style.left = `${currentRect.left + thirdWidth}px`;
        this.imageDragState.belowIndicator.style.top = `${currentRect.top + halfHeight}px`;
        this.imageDragState.belowIndicator.style.width = `${thirdWidth}px`;
        this.imageDragState.belowIndicator.style.height = `${halfHeight}px`;
      }

      // 更新右侧指示器
      if (this.imageDragState.rightIndicator) {
        this.imageDragState.rightIndicator.style.left = `${currentRect.left + thirdWidth * 2}px`;
        this.imageDragState.rightIndicator.style.top = `${currentRect.top}px`;
        this.imageDragState.rightIndicator.style.width = `${thirdWidth}px`;
        this.imageDragState.rightIndicator.style.height = `${currentRect.height}px`;
      }

      // 更新左侧分隔线
      if (this.imageDragState.leftDivider) {
        this.imageDragState.leftDivider.style.left = `${currentRect.left + thirdWidth}px`;
        this.imageDragState.leftDivider.style.top = `${currentRect.top}px`;
        this.imageDragState.leftDivider.style.height = `${currentRect.height}px`;
      }

      // 更新右侧分隔线
      if (this.imageDragState.rightDivider) {
        this.imageDragState.rightDivider.style.left = `${currentRect.left + thirdWidth * 2}px`;
        this.imageDragState.rightDivider.style.top = `${currentRect.top}px`;
        this.imageDragState.rightDivider.style.height = `${currentRect.height}px`;
      }

      // 更新中间分隔线
      if (this.imageDragState.middleDivider) {
        this.imageDragState.middleDivider.style.left = `${currentRect.left + thirdWidth}px`;
        this.imageDragState.middleDivider.style.top = `${currentRect.top + halfHeight}px`;
        this.imageDragState.middleDivider.style.width = `${thirdWidth}px`;
      }
    };

    // 更新遮罩层显示状态（基于鼠标位置判断在哪个区域）
    const updateIndicators = (mouseX: number, mouseY: number) => {
      if (!this.imageDragState) return;

      // 先更新所有元素的位置
      updatePositions();

      // 获取节点的当前位置
      const currentRect = nodeElement.getBoundingClientRect();
      const relativeX = mouseX - currentRect.left;
      const relativeY = mouseY - currentRect.top;
      const thirdWidth = currentRect.width / 3;
      const halfHeight = currentRect.height / 2;

      const dimOpacity = 'rgba(255, 122, 69, 0.05)';
      const highlightOpacity = 'rgba(255, 122, 69, 0.25)';

      // 判断鼠标在哪个区域
      let selectedPosition: ImagePosition;
      if (relativeX < thirdWidth) {
        selectedPosition = 'left';
      } else if (relativeX > thirdWidth * 2) {
        selectedPosition = 'right';
      } else if (relativeY < halfHeight) {
        selectedPosition = 'above';
      } else {
        selectedPosition = 'below';
      }

      // 更新所有指示器的背景色
      const indicators = {
        left: this.imageDragState.leftIndicator,
        right: this.imageDragState.rightIndicator,
        above: this.imageDragState.aboveIndicator,
        below: this.imageDragState.belowIndicator,
      };

      for (const [position, indicator] of Object.entries(indicators)) {
        indicator?.style.setProperty(
          'background-color',
          position === selectedPosition ? highlightOpacity : dimOpacity,
          'important'
        );
      }

      this.imageDragState.hoverPosition = selectedPosition;
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // 超过拖拽阈值后显示指示器
      if (!isDragStarted && distance >= DRAG_THRESHOLD) {
        isDragStarted = true;
        this.isDraggingImage = true;

        // 创建指示器和边框
        const indicators = createIndicators();
        if (this.imageDragState) {
          Object.assign(this.imageDragState, {
            isDragging: true,
            ...indicators,
          });
        }

        // 降低节点内容的透明度
        this.setNodeContentOpacity(nodeElement, '0.4');
        wrapper.style.cursor = 'grabbing';
        document.body.style.cursor = 'grabbing';
      }

      // 如果已经开始拖拽，更新指示器
      if (isDragStarted) {
        updateIndicators(moveEvent.clientX, moveEvent.clientY);
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';

      if (isDragStarted) {
        const newPosition = this.getPositionFromMouseEvent(upEvent, nodeElement);

        if (newPosition && this.config.onImagePosition) {
          this.removeGlobalClickListener();
          this.selectedImageContainer = null;
          this.config.onImagePosition(nodeId, newPosition);
        }
      }

      this.cleanupDrag();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  /**
   * 根据鼠标事件获取图片位置
   */
  private getPositionFromMouseEvent(event: MouseEvent, nodeElement: HTMLElement): ImagePosition {
    const rect = nodeElement.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const relativeY = event.clientY - rect.top;
    const thirdWidth = rect.width / 3;
    const halfHeight = rect.height / 2;

    if (relativeX < thirdWidth) return 'left';
    if (relativeX > thirdWidth * 2) return 'right';
    if (relativeY < halfHeight) return 'above';
    return 'below';
  }

  /**
   * 设置节点内容的透明度
   */
  private setNodeContentOpacity(nodeElement: HTMLElement, opacity: string): void {
    const nodeContent = nodeElement.querySelector('.node-content') as HTMLElement;
    const nodeImageContainers = nodeElement.querySelectorAll('.node-image-container') as NodeListOf<HTMLElement>;

    const styleProps = opacity ? { opacity, position: 'relative', zIndex: '1' } : { opacity: '', position: '', zIndex: '' };

    if (nodeContent) {
      Object.assign(nodeContent.style, styleProps);
    }
    nodeImageContainers.forEach(container => {
      Object.assign(container.style, styleProps);
    });
  }

  /**
   * 清理拖拽状态
   */
  private cleanupDrag(): void {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // 恢复 wrapper 的光标
    if (this.selectedImageContainer) {
      this.selectedImageContainer.style.cursor = 'pointer';
    }

    if (this.imageDragState) {
      if (this.imageDragState.nodeElement) {
        this.setNodeContentOpacity(this.imageDragState.nodeElement, '');
      }

      const elements = [
        this.imageDragState.aboveIndicator,
        this.imageDragState.belowIndicator,
        this.imageDragState.leftIndicator,
        this.imageDragState.rightIndicator,
        this.imageDragState.borderOverlay,
        this.imageDragState.leftDivider,
        this.imageDragState.rightDivider,
        this.imageDragState.middleDivider,
        this.imageDragState.ghostElement,
      ];

      elements.forEach(el => el?.remove());
    }

    this.imageDragState = null;

    setTimeout(() => {
      this.isDraggingImage = false;
    }, 50);

    if (this.selectedImageContainer) {
      setTimeout(() => {
        this.addGlobalClickListener();
      }, 100);
    }
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
    // 如果 selectedImageContainer 为 null（比如正在位置变更中），不处理
    if (!this.selectedImageContainer) {
      return;
    }
    
    // 如果点击的是选中的图片容器内的元素，不取消选中
    if (this.selectedImageContainer.contains(e.target as Node)) {
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
    this.cleanupDrag();
    document.removeEventListener('mousemove', this.handleImageResizeMove);
    document.removeEventListener('mouseup', this.handleImageResizeEnd);
  }
}

