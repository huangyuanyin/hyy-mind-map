import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { Theme, ViewState, RichContent, TableData, CodeBlockData } from '../types';
import { DEFAULT_THEME } from '../constants/theme';
import { LAYOUT } from '../constants';
import { ImageResizeHandler, type ImageResizeCallback, type ImagePreviewCallback } from './ImageResizeHandler';

/**
 * 编辑完成回调
 */
export type EditCompleteCallback = (nodeId: string, content: RichContent) => void;

/**
 * 节点点击回调
 */
export type NodeClickCallback = (nodeId: string, event: MouseEvent) => void;

/**
 * 节点鼠标按下回调
 */
export type NodeMouseDownCallback = (nodeId: string, event: MouseEvent) => void;

/**
 * 表格更新回调
 */
export type TableUpdateCallback = (nodeId: string, table: TableData) => void;

/**
 * 代码块更新回调
 */
export type CodeBlockUpdateCallback = (nodeId: string, codeBlock: CodeBlockData) => void;

/**
 * 清除附件回调
 */
export type ClearAttachmentCallback = (nodeId: string) => void;

/**
 * 表格菜单触发回调
 */
export type TableMenuTriggerCallback = (
  nodeId: string,
  type: 'row' | 'column',
  index: number,
  rect: DOMRect
) => void;

/**
 * 图片选中状态变化回调
 */
export type ImageSelectChangeCallback = (nodeId: string | null) => void;

/**
 * 节点 DOM 渲染器
 * 负责将节点渲染为 DOM 元素
 */
export class NodeDOMRenderer {
  private container: HTMLElement;
  private nodesContainer: HTMLElement;
  private theme: Theme;
  private nodeElements: Map<string, HTMLElement> = new Map();
  private viewState: ViewState = {
    scale: 1,
    translateX: 0,
    translateY: 0,
  };
  
  // 当前编辑中的节点
  private editingNodeId: string | null = null;
  // 当前编辑中的单元格（表格/代码块）
  private editingCellNodeId: string | null = null;
  // 上次点击的节点 ID
  private lastClickedNodeId: string | null = null;
  // 编辑完成回调
  private onEditComplete: EditCompleteCallback | null = null;
  // 节点点击回调
  private onNodeClick: NodeClickCallback | null = null;
  // 节点鼠标按下回调
  private onNodeMouseDown: NodeMouseDownCallback | null = null;
  // 表格更新回调
  private onTableUpdate: TableUpdateCallback | null = null;
  // 代码块更新回调
  private onCodeBlockUpdate: CodeBlockUpdateCallback | null = null;
  // 清除附件回调
  private onClearAttachment: ClearAttachmentCallback | null = null;
  // 表格菜单触发回调
  private onTableMenuTrigger: TableMenuTriggerCallback | null = null;
  // 高亮状态（用于重新渲染后恢复高亮）
  private highlightState: { nodeId: string; type: 'row' | 'column'; index: number } | null = null;
  // 当前激活的操作按钮
  private activeMenuButton: HTMLElement | null = null;
  // 节点数据缓存（用于编辑时访问）
  private nodeDataCache: Map<string, HyyMindMapNode> = new Map();
  // 记录 mousedown 时节点是否已选中（用于判断是否应该进入编辑模式）
  private wasNodeSelectedOnMouseDown: Map<string, boolean> = new Map();
  // 图片调整处理器
  private imageResizeHandler: ImageResizeHandler;
  // 当前图片选中的节点 ID（用于隐藏节点选中态）
  private imageSelectedNodeId: string | null = null;
  // 图片选中状态变化回调
  private onImageSelectChange: ImageSelectChangeCallback | null = null;

  constructor(container: HTMLElement, theme?: Partial<Theme>) {
    this.container = container;
    this.theme = { ...DEFAULT_THEME, ...theme };
    this.nodesContainer = this.createNodesContainer();

    // 初始化图片调整处理器
    this.imageResizeHandler = new ImageResizeHandler({
      getViewState: () => this.viewState,
      getNodeDataCache: () => this.nodeDataCache,
      onImageSelect: (nodeId) => {
        const prevNodeId = this.imageSelectedNodeId;
        this.imageSelectedNodeId = nodeId;

        // 图片选中时，更新对应节点的样式（隐藏选中态）
        if (nodeId) {
          const element = this.nodeElements.get(nodeId);
          const node = this.nodeDataCache.get(nodeId);
          if (element && node) {
            this.updateNodeStyles(element, node);
          }
        }

        // 图片取消选中时，恢复之前节点的选中态
        if (prevNodeId && !nodeId) {
          const element = this.nodeElements.get(prevNodeId);
          const node = this.nodeDataCache.get(prevNodeId);
          if (element && node) {
            this.updateNodeStyles(element, node);
          }
        }

        this.onImageSelectChange?.(nodeId);
      },
    });
  }

  /**
   * 设置编辑完成回调
   */
  public setEditCompleteCallback(callback: EditCompleteCallback): void {
    this.onEditComplete = callback;
  }

  /**
   * 设置节点点击回调
   */
  public setNodeClickCallback(callback: NodeClickCallback): void {
    this.onNodeClick = callback;
  }

  /**
   * 设置节点鼠标按下回调
   */
  public setNodeMouseDownCallback(callback: NodeMouseDownCallback): void {
    this.onNodeMouseDown = callback;
  }

  /**
   * 设置表格更新回调
   */
  public setTableUpdateCallback(callback: TableUpdateCallback): void {
    this.onTableUpdate = callback;
  }

  /**
   * 设置代码块更新回调
   */
  public setCodeBlockUpdateCallback(callback: CodeBlockUpdateCallback): void {
    this.onCodeBlockUpdate = callback;
  }

  /**
   * 设置清除附件回调
   */
  public setClearAttachmentCallback(callback: ClearAttachmentCallback): void {
    this.onClearAttachment = callback;
  }

  /**
   * 设置表格菜单触发回调
   */
  public setTableMenuTriggerCallback(callback: TableMenuTriggerCallback): void {
    this.onTableMenuTrigger = callback;
  }

  /**
   * 设置图片尺寸更新回调
   */
  public setImageResizeCallback(callback: ImageResizeCallback): void {
    this.imageResizeHandler.setImageResizeCallback(callback);
  }

  /**
   * 设置图片选中状态变化回调
   */
  public setImageSelectChangeCallback(callback: ImageSelectChangeCallback): void {
    this.onImageSelectChange = callback;
  }

  /**
   * 设置图片预览回调
   */
  public setImagePreviewCallback(callback: ImagePreviewCallback): void {
    this.imageResizeHandler.setImagePreviewCallback(callback);
  }

  // 高亮覆盖层元素
  private highlightOverlay: HTMLElement | null = null;

  /**
   * 创建高亮覆盖层
   */
  private createHighlightOverlay(
    table: HTMLElement,
    rect: { left: number; top: number; width: number; height: number }
  ): void {
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.className = 'table-highlight-overlay';
    this.highlightOverlay.style.cssText = `
      position: absolute;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid #5ab5e8;
      border-radius: 2px;
      background-color: rgba(232, 244, 252, 0.5);
      pointer-events: none;
      z-index: 5;
      box-sizing: border-box;
    `;
    table.style.position = 'relative';
    table.appendChild(this.highlightOverlay);
  }

  /**
   * 高亮表格行
   */
  private highlightTableRow(table: HTMLElement, rowIndex: number, nodeId: string): void {
    this.clearTableHighlight();
    const rows = table.querySelectorAll('tr');
    const targetRow = rows[rowIndex] as HTMLElement;
    if (!targetRow) return;

    const cells = targetRow.querySelectorAll('td');
    const firstCell = cells[0] as HTMLElement;
    if (!firstCell) return;

    let top = 0;
    for (let i = 0; i < rowIndex; i++) {
      top += (rows[i] as HTMLElement).offsetHeight;
    }

    let width = 0;
    cells.forEach((cell) => {
      width += (cell as HTMLElement).offsetWidth;
    });

    this.createHighlightOverlay(table, {
      left: firstCell.offsetLeft,
      top,
      width,
      height: targetRow.offsetHeight,
    });
    this.highlightState = { nodeId, type: 'row', index: rowIndex };
  }

  /**
   * 高亮表格列
   */
  private highlightTableColumn(table: HTMLElement, colIndex: number, nodeId: string): void {
    this.clearTableHighlight();
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return;

    const firstRow = rows[0];
    const firstCell = firstRow.querySelectorAll('td')[colIndex] as HTMLElement;
    if (!firstCell) return;

    let left = 0;
    const firstRowCells = firstRow.querySelectorAll('td');
    for (let i = 0; i < colIndex; i++) {
      left += (firstRowCells[i] as HTMLElement).offsetWidth;
    }

    let height = 0;
    rows.forEach((row) => {
      height += (row as HTMLElement).offsetHeight;
    });

    this.createHighlightOverlay(table, {
      left,
      top: 0,
      width: firstCell.offsetWidth,
      height,
    });
    this.highlightState = { nodeId, type: 'column', index: colIndex };
  }

  /**
   * 清除表格高亮
   */
  public clearTableHighlight(): void {
    if (this.highlightOverlay?.parentNode) {
      this.highlightOverlay.parentNode.removeChild(this.highlightOverlay);
    }
    this.highlightOverlay = null;
    this.highlightState = null;

    if (this.activeMenuButton) {
      this.activeMenuButton.classList.remove('active');
      this.activeMenuButton.style.display = 'none';
      this.activeMenuButton = null;
    }
  }

  /**
   * 恢复表格高亮（重新渲染后）
   */
  private restoreTableHighlight(nodeId: string): void {
    if (!this.highlightState || this.highlightState.nodeId !== nodeId) {
      return;
    }

    const element = this.nodeElements.get(nodeId);
    if (!element) return;

    const table = element.querySelector('.node-table') as HTMLElement;
    if (!table) return;

    const savedState = this.highlightState;

    if (savedState.type === 'row') {
      this.highlightTableRow(table, savedState.index, nodeId);
      
      const rows = table.querySelectorAll('tr');
      const targetRow = rows[savedState.index];
      if (targetRow) {
        const firstCell = targetRow.querySelector('td:first-child') as HTMLElement;
        if (firstCell) {
          const btn = firstCell.querySelector('.table-row-trigger-btn') as HTMLElement;
          if (btn) {
            btn.style.display = 'flex';
            this.activeMenuButton = btn;
            btn.classList.add('active');
          }
        }
      }
    } else if (savedState.type === 'column') {
      this.highlightTableColumn(table, savedState.index, nodeId);
      
      // 恢复激活按钮的显示和样式
      const rows = table.querySelectorAll('tr');
      const headerRow = rows[0];
      if (headerRow) {
        const cells = headerRow.querySelectorAll('td');
        const targetCell = cells[savedState.index] as HTMLElement;
        if (targetCell) {
          const btn = targetCell.querySelector('.table-col-trigger-btn') as HTMLElement;
          if (btn) {
            btn.style.display = 'flex';
            this.activeMenuButton = btn;
            btn.classList.add('active');
          }
        }
      }
    }
  }

  /**
   * 创建节点容器
   */
  private createNodesContainer(): HTMLElement {
    const nodesContainer = document.createElement('div');
    nodesContainer.className = 'mind-map-nodes-container';
    nodesContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
      z-index: 1;
    `;
    this.container.appendChild(nodesContainer);
    return nodesContainer;
  }

  /**
   * 设置视图状态
   */
  public setViewState(scale: number, translateX: number, translateY: number): void {
    this.viewState = { scale, translateX, translateY };
    this.updateAllNodesTransform();
  }

  /**
   * 更新所有节点的变换
   */
  private updateAllNodesTransform(): void {
    const { scale, translateX, translateY } = this.viewState;
    this.nodesContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    this.nodesContainer.style.transformOrigin = '0 0';
  }

  /**
   * 渲染所有节点
   */
  public render(root: HyyMindMapNode | null): void {
    if (!root) {
      this.clear();
      return;
    }

    // 标记所有现有节点为待删除
    const existingIds = new Set(this.nodeElements.keys());
    
    // 递归渲染节点
    this.renderNodeRecursive(root, existingIds);

    // 删除不再存在的节点
    existingIds.forEach(id => {
      const element = this.nodeElements.get(id);
      if (element) {
        element.remove();
        this.nodeElements.delete(id);
      }
    });

    // 同步有附件节点的实际尺寸
    // 需要保存 root 引用，以便在回调中使用
    this.pendingRoot = root;
    this.lastRenderHadSizeUpdates = false;

    requestAnimationFrame(() => {
      if (this.pendingRoot) {
        const hasUpdates = this.syncAttachmentNodeSizes(this.pendingRoot);
        this.lastRenderHadSizeUpdates = hasUpdates;
        this.pendingRoot = null;
        
        // 如果有尺寸更新，触发回调
        if (hasUpdates && this.onSizeUpdateCallback) {
          this.onSizeUpdateCallback();
        }
      }
    });
  }

  /**
   * 待处理的根节点（用于异步尺寸同步）
   */
  private pendingRoot: HyyMindMapNode | null = null;

  /**
   * 上次渲染是否有尺寸更新
   */
  private lastRenderHadSizeUpdates = false;

  /**
   * 尺寸更新回调
   */
  private onSizeUpdateCallback: (() => void) | null = null;

  /**
   * 设置尺寸更新回调
   */
  public setOnSizeUpdateCallback(callback: () => void): void {
    this.onSizeUpdateCallback = callback;
  }

  /**
   * 检查上次渲染是否有附件节点尺寸更新
   */
  public hadSizeUpdates(): boolean {
    return this.lastRenderHadSizeUpdates;
  }

  /**
   * 同步有附件节点的实际 DOM 尺寸到节点数据
   * @returns 是否有节点尺寸被更新
   */
  private syncAttachmentNodeSizes(node: HyyMindMapNode): boolean {
    let hasUpdates = false;
    const attachment = node.config?.attachment;
    
    if (attachment?.type === 'table' || attachment?.type === 'code') {
      const element = this.nodeElements.get(node.id);
      if (element) {
        // 获取 DOM 元素的实际尺寸（包括边框）
        const rect = element.getBoundingClientRect();
        const scale = this.viewState.scale || 1;
        // 考虑缩放比例，还原到实际尺寸
        const actualWidth = rect.width / scale;
        const actualHeight = rect.height / scale;
        
        // 更新节点尺寸（只在尺寸不同时更新）
        if (Math.abs(node.width - actualWidth) > 1 || Math.abs(node.height - actualHeight) > 1) {
          node.width = actualWidth;
          node.height = actualHeight;
          hasUpdates = true;
        }
      }
    }

    for (const child of node.children) {
      if (this.shouldChildBeVisible(node, child)) {
        if (this.syncAttachmentNodeSizes(child)) {
          hasUpdates = true;
        }
      }
    }
    
    return hasUpdates;
  }

  /**
   * 递归渲染节点
   */
  private renderNodeRecursive(node: HyyMindMapNode, existingIds: Set<string>): void {
    // 检查节点是否可见
    if (!this.shouldRenderNode(node)) {
      return;
    }

    existingIds.delete(node.id);

    // 缓存节点数据
    this.nodeDataCache.set(node.id, node);

    let element = this.nodeElements.get(node.id);
    if (!element) {
      element = this.createNodeElement(node);
      this.nodeElements.set(node.id, element);
      this.nodesContainer.appendChild(element);
    } else {
    }

    this.updateNodeElement(element, node);

    // 渲染子节点
    for (const child of node.children) {
      if (this.shouldChildBeVisible(node, child)) {
        this.renderNodeRecursive(child, existingIds);
      }
    }
  }

  /**
   * 判断节点是否应该渲染
   */
  private shouldRenderNode(node: HyyMindMapNode): boolean {
    // 根节点总是渲染
    if (!node.parent) return true;

    // 检查父节点的展开状态
    return this.shouldChildBeVisible(node.parent, node);
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
   * 创建节点 DOM 元素
   */
  private createNodeElement(node: HyyMindMapNode): HTMLElement {
    const element = document.createElement('div');
    element.className = 'mind-map-node';
    element.dataset.nodeId = node.id;
    element.style.cssText = `
      position: absolute;
      box-sizing: border-box;
      pointer-events: auto;
      cursor: pointer;
      user-select: none;
      border-radius: ${this.theme.borderRadius}px;
      background-color: ${this.theme.nodeBackgroundColor};
      font-size: ${this.theme.fontSize}px;
      font-family: ${this.theme.fontFamily};
      color: ${this.theme.nodeTextColor};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: ${this.theme.padding}px;
      transition: box-shadow 0.2s, border-color 0.2s;
    `;

    // 创建图片容器（在内容上方，不可编辑）
    const imageContainer = document.createElement('div');
    imageContainer.className = 'node-image-container';
    imageContainer.contentEditable = 'false';
    imageContainer.style.cssText = `
      text-align: center;
      user-select: none;
      pointer-events: auto;
    `;
    element.appendChild(imageContainer);

    // 创建内容容器
    const contentContainer = document.createElement('div');
    contentContainer.className = 'node-content';
    contentContainer.style.cssText = `
      text-align: left;
      white-space: nowrap;
      overflow: visible;
      display: inline-block;
    `;
    element.appendChild(contentContainer);

    // 绑定鼠标按下事件（用于拖拽）
    element.addEventListener('mousedown', (e) => {
      // 如果正在编辑，不触发拖拽
      if (this.editingNodeId || this.editingCellNodeId) return;
      
      // 如果点击的是可编辑单元格或代码块，不触发拖拽
      const target = e.target as HTMLElement;
      if (target.classList.contains('editable-cell') || 
          target.classList.contains('code-content') ||
          target.closest('.editable-cell') ||
          target.closest('.code-content')) {
        return;
      }
      
      const nodeId = element.dataset.nodeId;
      if (nodeId) {
        // 如果点击了不同的节点，清除上次点击记录
        if (this.lastClickedNodeId !== nodeId) {
          this.lastClickedNodeId = nodeId;
        }
        
        // 在 mousedown 时保存节点的选中状态，用于后续 click 判断是否进入编辑模式
        const cachedNode = this.nodeDataCache.get(nodeId);
        const wasSelected = cachedNode && (cachedNode.isSelected || cachedNode.isActive);
        this.wasNodeSelectedOnMouseDown.set(nodeId, !!wasSelected);
        
        if (this.onNodeMouseDown) {
          this.onNodeMouseDown(nodeId, e);
        }
      }
    });

    // 绑定单击事件（选中节点）
    element.addEventListener('click', (e) => {
      // 如果点击的是可编辑单元格或代码块，不触发节点选中
      const target = e.target as HTMLElement;
      if (target.classList.contains('editable-cell') || 
          target.classList.contains('code-content') ||
          target.closest('.editable-cell') ||
          target.closest('.code-content') ||
          target.closest('.node-code-block')) {
        return;
      }
      
      const nodeId = element.dataset.nodeId;
      if (!nodeId) return;

      // 触发选中（编辑逻辑由 .node-content 的 click 事件处理）
      if (this.onNodeClick) {
        this.onNodeClick(nodeId, e);
      }
    });

    // 绑定双击事件（进入编辑模式）- 直接在节点元素上绑定，确保始终有效
    element.addEventListener('dblclick', (e) => {
      // 如果点击的是可编辑单元格或代码块，不触发节点编辑
      const target = e.target as HTMLElement;
      if (target.classList.contains('editable-cell') ||
          target.classList.contains('code-content') ||
          target.closest('.editable-cell') ||
          target.closest('.code-content') ||
          target.closest('.node-code-block')) {
        return;
      }

      const nodeId = element.dataset.nodeId;
      if (!nodeId) {
        return;
      }

      e.stopPropagation();
      e.preventDefault();
      this.startEdit(nodeId, e.clientX, e.clientY);
    });

    return element;
  }

  /**
   * 更新节点元素
   */
  private updateNodeElement(element: HTMLElement, node: HyyMindMapNode): void {
    // 始终更新节点数据缓存，确保事件处理器能访问到最新的节点状态
    this.nodeDataCache.set(node.id, node);

    // 检查是否有附加内容（表格或代码块）
    const attachment = node.config?.attachment;
    const hasAttachment = attachment?.type === 'table' || attachment?.type === 'code';

    // 更新位置和尺寸
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    element.style.width = hasAttachment ? 'auto' : `${node.width}px`;
    // 表格/代码块节点和需要换行的普通文本节点使用自动高度
    const needsAutoHeight = hasAttachment || node.width >= LAYOUT.MAX_NODE_WIDTH;
    element.style.height = needsAutoHeight ? 'auto' : `${node.height}px`;
    element.style.minWidth = hasAttachment ? `${node.width}px` : '';
    element.style.minHeight = (hasAttachment || needsAutoHeight) ? `${node.height}px` : '';

    // 如果节点正在编辑（包括表格/代码块单元格），不更新内容
    const isEditing = this.editingNodeId === node.id || this.editingCellNodeId === node.id;
    
    // 对于表格/代码块节点，不使用节点 padding（表格自己有 margin）
    element.style.padding = hasAttachment ? '0' : `${this.theme.padding}px`;
    
    // 更新内容（只在非编辑状态下）
    if (!isEditing) {
      let imageContainer = element.querySelector('.node-image-container') as HTMLElement;
      const contentContainer = element.querySelector('.node-content') as HTMLElement;
      
      // 如果图片容器不存在，创建它（兼容旧的节点元素）
      if (!imageContainer && contentContainer) {
        imageContainer = document.createElement('div');
        imageContainer.className = 'node-image-container';
        imageContainer.contentEditable = 'false';
        imageContainer.style.cssText = `
          text-align: center;
          user-select: none;
          pointer-events: auto;
        `;
        // 插入到内容容器之前
        element.insertBefore(imageContainer, contentContainer);
      }
      
      // 更新图片容器（图片在内容上方，单独区域，不可编辑）
      if (imageContainer) {
        const imageData = node.config?.image;
        if (imageData) {
          const displayWidth = imageData.displayWidth || 200;
          // 检查是否需要更新图片
          const existingImg = imageContainer.querySelector('.node-image') as HTMLImageElement;
          const needsUpdate = !existingImg || 
            existingImg.src !== imageData.base64 || 
            parseInt(existingImg.style.width) !== displayWidth;
          
          if (needsUpdate) {
            // 清空容器并重新创建图片
            imageContainer.innerHTML = '';
            
            // 创建图片包装器
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'node-image-wrapper';
            imageWrapper.style.cssText = `
              position: relative;
              display: inline-block;
              margin: 0 auto 8px auto;
            `;
            
            // 创建图片元素
            const img = document.createElement('img');
            img.src = imageData.base64;
            img.className = 'node-image';
            img.style.cssText = `
              width: ${displayWidth}px;
              height: auto;
              border-radius: 4px;
              display: block;
            `;
            
            imageWrapper.appendChild(img);
            imageContainer.appendChild(imageWrapper);
            
            this.imageResizeHandler.bindImageClickEvents(imageWrapper, node.id, imageData);
          } else if (existingImg) {
            // 只更新宽度
            existingImg.style.width = `${displayWidth}px`;
          }
          
          imageContainer.style.display = 'block';
          
          // 如果当前图片被选中，确保手柄存在
          if (this.imageResizeHandler.getSelectedImageNodeId() === node.id) {
            const wrapper = imageContainer.querySelector('.node-image-wrapper') as HTMLElement;
            if (wrapper && !wrapper.querySelector('.image-resize-handle')) {
              this.imageResizeHandler.showImageResizeHandles(wrapper, node.id, imageData);
            }
          }
        } else {
          imageContainer.innerHTML = '';
          imageContainer.style.display = 'none';
          if (this.imageResizeHandler.getSelectedImageNodeId() === node.id) {
            this.imageResizeHandler.clearImageSelection();
          }
        }
      }
      
      if (contentContainer) {
        // 对于有附件的节点（表格/代码块），使用左对齐，避免居中导致内容超出节点边界
        element.style.justifyContent = hasAttachment ? 'flex-start' : 'center';

        contentContainer.style.display = 'inline-block';
        contentContainer.style.textAlign = 'left';

        // 根据节点宽度决定是否允许换行
        const needsWrap = node.width >= LAYOUT.MAX_NODE_WIDTH;
        if (needsWrap) {
          contentContainer.style.maxWidth = `${LAYOUT.MAX_NODE_WIDTH - this.theme.padding * 2}px`;
        } else {
          contentContainer.style.maxWidth = '';
        }
        contentContainer.style.whiteSpace = needsWrap ? 'normal' : 'nowrap';
        contentContainer.style.wordWrap = needsWrap ? 'break-word' : 'normal';
        contentContainer.style.wordBreak = needsWrap ? 'break-all' : 'normal';
        
        // 渲染图标（图标在所有情况下都需要渲染）
        // 图标尺寸与 constants/index.ts 中的 ICON 常量保持一致
        const ICON_SIZE = 20;
        const ICON_GAP = 4;
        const ICON_TEXT_PADDING = 6;

        let iconsHtml = '';
        const icons = node.config?.icons;
        const singleIcon = node.config?.icon;

        if (icons && Object.keys(icons).length > 0) {
          // 多个图标
          const iconUrls = Object.values(icons);
          iconsHtml = `<span class="node-icons" style="display: inline-flex; align-items: center; margin-right: ${ICON_TEXT_PADDING}px; flex-shrink: 0;">` +
            iconUrls.map((iconUrl, index) =>
              `<img src="${iconUrl}" style="width: ${ICON_SIZE}px; height: ${ICON_SIZE}px; ${index < iconUrls.length - 1 ? `margin-right: ${ICON_GAP}px;` : ''}" />`
            ).join('') + '</span>';
        } else if (singleIcon) {
          // 单个图标
          iconsHtml = `<span class="node-icons" style="display: inline-flex; align-items: center; margin-right: ${ICON_TEXT_PADDING}px; flex-shrink: 0;"><img src="${singleIcon}" style="width: ${ICON_SIZE}px; height: ${ICON_SIZE}px;" /></span>`;
        }

        // 计算新的 HTML 内容（不包含图片，图片在单独的容器中）
        let newHtml = '';

        if (attachment?.type === 'table' && attachment.table) {
          // 渲染图标 + 表格
          newHtml = iconsHtml + this.renderTableHTML(attachment.table, node.id);
        } else if (attachment?.type === 'code' && attachment.codeBlock) {
          // 渲染图标 + 代码块
          newHtml = iconsHtml + this.renderCodeBlockHTML(attachment.codeBlock, node.id);
        } else {
          // 检查节点是否有内容
          const nodeText = node.text?.trim() || '';
          const richHtml = node.richContent?.html?.trim() || '';
          // 检查 richContent.html 是否只有空标签（如 <br>）
          const isRichHtmlEmpty = !richHtml || richHtml === '<br>' || richHtml === '<br/>' || richHtml === '&nbsp;';

          if (nodeText && !isRichHtmlEmpty) {
            // 有富文本内容
            newHtml = iconsHtml + node.richContent!.html!;
          } else if (nodeText) {
            // 只有纯文本内容
            newHtml = iconsHtml + `<span>${node.text}</span>`;
          } else if (iconsHtml) {
            // 只有图标，没有文本
            newHtml = iconsHtml;
          } else {
            // 显示占位符
            const hasImage = !!node.config?.image;
            newHtml = hasImage ? '' : '输入文字';
          }
        }

        // 只有当内容真的变化时才修改 innerHTML（避免破坏事件监听器）
        const currentHtml = contentContainer.innerHTML;
        if (currentHtml !== newHtml) {
          contentContainer.innerHTML = newHtml;

          // 更新 placeholder 类
          if (newHtml === '输入文字') {
            contentContainer.classList.add('placeholder');
          } else {
            contentContainer.classList.remove('placeholder');
          }

          // 绑定事件（只在 innerHTML 更新后才需要重新绑定）
          if (attachment?.type === 'table' && attachment.table) {
            this.bindTableCellEvents(contentContainer, node.id);
            // 恢复表格高亮
            this.restoreTableHighlight(node.id);
          } else if (attachment?.type === 'code' && attachment.codeBlock) {
            this.bindCodeBlockEvents(contentContainer, node.id);
          }
        }
        
        // 应用自定义文字样式（仅对文本内容）
        if (!attachment || attachment.type === 'text') {
          const isPlaceholder = contentContainer.classList.contains('placeholder');
          
          if (isPlaceholder) {
            contentContainer.style.color = '#999';
          } else if (node.config?.textColor) {
            contentContainer.style.color = node.config.textColor;
          } else {
            contentContainer.style.color = this.theme.nodeTextColor;
          }
          
          if (node.config?.fontSize) {
            contentContainer.style.fontSize = `${node.config.fontSize}px`;
          } else {
            contentContainer.style.fontSize = `${this.theme.fontSize}px`;
          }

          // 应用粗体
          contentContainer.style.fontWeight = node.config?.bold ? 'bold' : 'normal';
          
          // 应用斜体
          contentContainer.style.fontStyle = node.config?.italic ? 'italic' : 'normal';
          
          // 应用下划线和删除线
          const textDecorations: string[] = [];
          if (node.config?.underline) textDecorations.push('underline');
          if (node.config?.strikethrough) textDecorations.push('line-through');
          contentContainer.style.textDecoration = textDecorations.length > 0 ? textDecorations.join(' ') : 'none';
        }
      }
    }

    // 应用自定义背景色
    if (node.config?.backgroundColor) {
      element.style.backgroundColor = node.config.backgroundColor;
    } else {
      element.style.backgroundColor = this.theme.nodeBackgroundColor;
    }

    // 为普通文本节点绑定双击编辑事件（不依赖 isEditing 状态）
    if (!hasAttachment) {
      this.bindTextEditEvents(element, node.id);
    }

    // 更新样式状态（编辑时保持编辑样式）
    if (!isEditing) {
      this.updateNodeStyles(element, node);
    }
  }

  /**
   * 更新节点样式状态
   */
  private updateNodeStyles(element: HTMLElement, node: HyyMindMapNode): void {
    // 获取自定义边框色
    const customBorderColor = node.config?.borderColor;

    // 检查当前节点的图片是否被选中
    const isImageSelected = this.imageSelectedNodeId === node.id;

    // 始终保持 2px 边框，只改变颜色，避免 hover/选中时布局偏移
    if ((node.isSelected || node.isActive) && !isImageSelected) {
      // 节点选中/激活状态，但图片未选中时，显示节点选中样式
      element.style.border = `2px solid ${this.theme.nodeSelectedBorderColor}`;
      element.style.boxShadow = `0 0 0 2px ${this.theme.nodeSelectedBorderColor}20`;
      element.dataset.selected = 'true';
    } else if ((node.isSelected || node.isActive) && isImageSelected) {
      // 图片选中时，隐藏节点的选中/激活样式
      element.style.border = `2px solid ${customBorderColor || 'transparent'}`;
      element.style.boxShadow = 'none';
      element.dataset.selected = 'false';
    } else if (node.isHover) {
      element.style.border = `2px solid ${customBorderColor || this.theme.nodeBorderColor}`;
      element.style.boxShadow = 'none';
      element.dataset.selected = 'false';
      // 节点未选中时，清除该节点的图片选中状态
      if (this.imageResizeHandler.getSelectedImageNodeId() === node.id) {
        this.imageResizeHandler.clearImageSelection();
      }
    } else if (customBorderColor) {
      // 有自定义边框色时显示边框
      element.style.border = `2px solid ${customBorderColor}`;
      element.style.boxShadow = 'none';
      element.dataset.selected = 'false';
      if (this.imageResizeHandler.getSelectedImageNodeId() === node.id) {
        this.imageResizeHandler.clearImageSelection();
      }
    } else {
      // 默认状态：透明边框，保持布局稳定
      element.style.border = '2px solid transparent';
      element.style.boxShadow = 'none';
      element.dataset.selected = 'false';
      if (this.imageResizeHandler.getSelectedImageNodeId() === node.id) {
        this.imageResizeHandler.clearImageSelection();
      }
    }
  }

  /**
   * 根据 ID 获取节点元素
   */
  public getNodeElement(nodeId: string): HTMLElement | undefined {
    return this.nodeElements.get(nodeId);
  }

  /**
   * 开始编辑节点
   * @param nodeId 节点 ID
   * @param clientX 鼠标点击的 X 坐标（可选，用于定位光标）
   * @param clientY 鼠标点击的 Y 坐标（可选，用于定位光标）
   */
  public startEdit(nodeId: string, clientX?: number, clientY?: number): void {
    // 如果正在编辑同一个节点，不重复处理
    if (this.editingNodeId === nodeId) {
      return;
    }
    
    // 如果正在编辑其他节点，先结束（不触发保存，因为 blur 会处理）
    if (this.editingNodeId) {
      const oldElement = this.nodeElements.get(this.editingNodeId);
      if (oldElement) {
        const oldContent = oldElement.querySelector('.node-content') as HTMLElement;
        if (oldContent) {
          this.unbindEditEvents(oldContent);
          oldContent.contentEditable = 'false';
        }
      }
      this.editingNodeId = null;
    }

    const element = this.nodeElements.get(nodeId);
    if (!element) {
      return;
    }

    const contentContainer = element.querySelector('.node-content') as HTMLElement;
    if (!contentContainer) {
      return;
    }

    this.editingNodeId = nodeId;

    // 获取图标容器（如果有）- 在修改 innerHTML 之前获取
    const iconsContainer = contentContainer.querySelector('.node-icons');
    const iconsHtml = iconsContainer ? iconsContainer.outerHTML : '';
    
    // 检查是否是 placeholder，如果是则清空（但保留图标）
    const isPlaceholder = contentContainer.classList.contains('placeholder');
    if (isPlaceholder) {
      // 保留图标，只清空其他内容
      contentContainer.innerHTML = iconsHtml;
      contentContainer.classList.remove('placeholder');
      contentContainer.style.color = this.theme.nodeTextColor;
    }

    // 将图标设为不可编辑（重新获取，因为可能被重新渲染）
    const newIconsContainer = contentContainer.querySelector('.node-icons') as HTMLElement;
    if (newIconsContainer) {
      newIconsContainer.contentEditable = 'false';
    }

    // 设置为可编辑
    contentContainer.contentEditable = 'true';
    contentContainer.style.outline = 'none';
    contentContainer.style.cursor = 'text';
    contentContainer.style.userSelect = 'text';
    contentContainer.style.minWidth = '20px';

    // 聚焦
    contentContainer.focus();

    // 如果有鼠标坐标，将光标定位到点击位置
    if (clientX !== undefined && clientY !== undefined && contentContainer.textContent) {
      this.setCaretAtPoint(clientX, clientY);
    }

    // 编辑时保持选中样式，不额外添加边框
    element.style.zIndex = '100';

    // 绑定事件
    this.bindEditEvents(contentContainer, nodeId);
  }

  /**
   * 将光标定位到指定坐标位置
   */
  private setCaretAtPoint(x: number, y: number): void {
    // 使用 caretRangeFromPoint (Chrome/Safari) 或 caretPositionFromPoint (Firefox)
    let range: Range | null = null;
    
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if ((document as any).caretPositionFromPoint) {
      const pos = (document as any).caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }

    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  /**
   * 绑定编辑事件
   */
  private bindEditEvents(contentContainer: HTMLElement, nodeId: string): void {
    // 先移除旧的事件处理器（如果有）
    this.unbindEditEvents(contentContainer);
    
    // 失焦时保存
    const handleBlur = () => {
      this.saveAndEndEdit(nodeId, contentContainer);
    };

    // 按键处理
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Enter 保存（Shift+Enter 换行）
        e.preventDefault();
        this.saveAndEndEdit(nodeId, contentContainer);
      } else if (e.key === 'Escape') {
        // Escape 取消
        e.preventDefault();
        this.cancelEdit(nodeId);
      }
      // 阻止事件冒泡，防止触发快捷键
      e.stopPropagation();
    };

    // 阻止事件冒泡
    const stopPropagation = (e: Event) => {
      e.stopPropagation();
    };

    contentContainer.addEventListener('blur', handleBlur);
    contentContainer.addEventListener('keydown', handleKeyDown);
    contentContainer.addEventListener('mousedown', stopPropagation);
    contentContainer.addEventListener('click', stopPropagation);

    // 存储事件处理器以便移除
    (contentContainer as any)._editHandlers = {
      handleBlur,
      handleKeyDown,
      stopPropagation,
    };
  }

  /**
   * 移除编辑事件
   */
  private unbindEditEvents(contentContainer: HTMLElement): void {
    const handlers = (contentContainer as any)._editHandlers;
    if (handlers) {
      contentContainer.removeEventListener('blur', handlers.handleBlur);
      contentContainer.removeEventListener('keydown', handlers.handleKeyDown);
      contentContainer.removeEventListener('mousedown', handlers.stopPropagation);
      contentContainer.removeEventListener('click', handlers.stopPropagation);
      delete (contentContainer as any)._editHandlers;
    }
  }

  /**
   * 保存并结束编辑
   */
  private saveAndEndEdit(nodeId: string, contentContainer: HTMLElement): void {
    if (this.editingNodeId !== nodeId) return;

    // 克隆内容容器，移除图标后再获取 HTML
    const clonedContainer = contentContainer.cloneNode(true) as HTMLElement;
    const iconsInClone = clonedContainer.querySelector('.node-icons');
    if (iconsInClone) {
      iconsInClone.remove();
    }
    
    const html = clonedContainer.innerHTML;
    const text = clonedContainer.textContent || '';

    // 回调通知
    if (this.onEditComplete) {
      this.onEditComplete(nodeId, { html, text });
    }

    this.endEdit();
  }

  /**
   * 取消编辑
   */
  private cancelEdit(_nodeId: string): void {
    // 不保存，直接结束
    this.endEdit();
  }

  /**
   * 结束编辑
   */
  public endEdit(): void {
    if (!this.editingNodeId) return;

    const element = this.nodeElements.get(this.editingNodeId);
    if (element) {
      const contentContainer = element.querySelector('.node-content') as HTMLElement;
      if (contentContainer) {
        // 移除事件
        this.unbindEditEvents(contentContainer);
        
        // 恢复不可编辑状态
        contentContainer.contentEditable = 'false';
        contentContainer.style.cursor = 'pointer';
        contentContainer.style.userSelect = 'none';

        // 检查内容是否为空（排除图标，处理浏览器可能保留的 <br> 标签）
        const clonedContainer = contentContainer.cloneNode(true) as HTMLElement;
        const iconsInClone = clonedContainer.querySelector('.node-icons');
        if (iconsInClone) {
          iconsInClone.remove();
        }
        const text = clonedContainer.textContent?.trim() || '';
        const html = clonedContainer.innerHTML?.trim() || '';
        const isEmpty = !text || html === '<br>' || html === '<br/>' || html === '&nbsp;';
        
        // 注意：不在这里处理 placeholder，让 updateNodeElement 统一处理
        if (!isEmpty) {
          // 有内容，确保移除 placeholder 样式
          contentContainer.classList.remove('placeholder');
        }
      }

      // 恢复样式
      element.style.zIndex = '';
      element.style.boxShadow = '';
    }

    this.editingNodeId = null;
  }

  /**
   * 检查是否正在编辑
   */
  public isEditing(): boolean {
    return this.editingNodeId !== null;
  }

  /**
   * 获取正在编辑的节点 ID
   */
  public getEditingNodeId(): string | null {
    return this.editingNodeId;
  }

  /**
   * 清除所有节点
   */
  public clear(): void {
    this.endEdit();
    this.nodeElements.forEach(element => element.remove());
    this.nodeElements.clear();
  }

  /**
   * 销毁
   */
  public destroy(): void {
    this.clear();
    this.nodesContainer.remove();
  }

  /**
   * 获取节点容器
   */
  public getNodesContainer(): HTMLElement {
    return this.nodesContainer;
  }

  /**
   * 渲染表格 HTML（带编辑功能）
   */
  private renderTableHTML(table: TableData, nodeId: string): string {
    if (!table.rows || table.rows.length === 0) {
      return '<div class="empty-table">空表格</div>';
    }

    // margin: 为操作按钮留出空间（上方和左侧各12px，下方和右侧8px）
    let html = `<table class="node-table" data-node-id="${nodeId}" style="border-collapse: collapse; font-size: 13px; border: 1px solid #e5e5e5; border-radius: 2px; margin: 12px 8px 8px 12px;">`;
    
    table.rows.forEach((row, rowIndex) => {
      html += '<tr>';
      row.forEach((cell, colIndex) => {
        html += `<td 
          class="editable-cell" 
          data-row="${rowIndex}" 
          data-col="${colIndex}"
          data-node-id="${nodeId}"
          style="border: 1px solid #e8e8e8; padding: 8px 12px; background: #fff; font-weight: normal; color: #666; min-width: 60px; max-width: 310px; word-wrap: break-word; word-break: break-all; white-space: normal; cursor: text; outline: none;"
        >${this.escapeHtml(cell.content) || '&nbsp;'}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</table>';
    return html;
  }

  /**
   * 绑定表格单元格编辑事件
   */
  private bindTableCellEvents(element: HTMLElement, nodeId: string): void {
    const cells = element.querySelectorAll('.editable-cell');
    
    cells.forEach((cell) => {
      const cellEl = cell as HTMLElement;
      
      // 标记是否在本次 mousedown 中设置了 lastClickedNodeId
      let justSetLastClickedNodeId = false;
      // 保存编辑前的原始内容，用于判断是否有变化
      let originalContent = '';
      
      // 检查是否允许进入编辑模式（需要先点击选中节点）
      const canEnterEditMode = (): boolean => {
        // 如果是刚刚在本次 mousedown 中设置的，不允许进入编辑模式
        if (justSetLastClickedNodeId) return false;
        // 如果上次点击的是同一个节点，则允许进入编辑模式
        return this.lastClickedNodeId === nodeId;
      };
      
      const enterEditMode = () => {
        if (cellEl.contentEditable !== 'true') {
          // 保存原始内容
          originalContent = cellEl.textContent || '';
          this.editingCellNodeId = nodeId;
          cellEl.contentEditable = 'true';
          cellEl.focus();
        }
      };
      
      // mousedown 事件
      cellEl.addEventListener('mousedown', (e) => {
        justSetLastClickedNodeId = false;
        
        if (cellEl.contentEditable === 'true') {
          e.stopPropagation();
          return;
        }
        
        // 检查是否允许进入编辑模式
        if (this.lastClickedNodeId !== nodeId) {
          // 第一次点击，记录节点 ID，让事件冒泡去选中节点
          this.lastClickedNodeId = nodeId;
          justSetLastClickedNodeId = true;
          return;
        }
        
        // 允许进入编辑模式，阻止冒泡
        e.stopPropagation();
        enterEditMode();
      });
      
      // 单击定位光标到点击位置
      cellEl.addEventListener('click', (e) => {
        if (!canEnterEditMode()) {
          return;
        }
        
        e.stopPropagation();
        e.preventDefault();
        
        // 确保已经进入编辑模式
        enterEditMode();
        
        // 如果用户已经通过拖拽选中了文字，不要重置光标位置
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
          return;
        }
        
        // 将光标定位到点击位置
        this.setCaretAtPoint(e.clientX, e.clientY);
      });

      // 失去焦点保存
      cellEl.addEventListener('blur', () => {
        cellEl.contentEditable = 'false';
        
        // 清除编辑标记
        this.editingCellNodeId = null;
        
        // 只在内容有变化时才保存
        const newContent = cellEl.textContent || '';
        if (newContent !== originalContent) {
          this.saveTableCell(nodeId, cellEl, newContent);
        }
      });

      // 回车键保存并移动到下一个单元格
      cellEl.addEventListener('keydown', (e) => {
        e.stopPropagation();
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
          e.preventDefault();
          cellEl.blur();
        } else if (keyEvent.key === 'Tab') {
          e.preventDefault();
          cellEl.blur();
          // 移动到下一个单元格
          const nextCell = keyEvent.shiftKey 
            ? cellEl.previousElementSibling || cellEl.parentElement?.previousElementSibling?.lastElementChild
            : cellEl.nextElementSibling || cellEl.parentElement?.nextElementSibling?.firstElementChild;
          if (nextCell) {
            (nextCell as HTMLElement).click();
          }
        } else if (keyEvent.key === 'Escape') {
          cellEl.blur();
        }
      });
    });

    // 绑定表格 hover 事件
    const table = element.querySelector('.node-table') as HTMLElement;
    if (table) {
      this.bindTableHoverEvents(table, nodeId);
    }
  }

  /**
   * 绑定表格 hover 事件（行列操作）
   */
  private bindTableHoverEvents(table: HTMLElement, nodeId: string): void {
    const rows = table.querySelectorAll('tr');

    // 为每行的第一个单元格添加行操作按钮
    rows.forEach((row, rowIndex) => {
      const rowEl = row as HTMLElement;
      const firstCell = rowEl.querySelector('td:first-child') as HTMLElement;
      if (!firstCell) return;

      // 创建行操作触发按钮
      const rowTriggerBtn = document.createElement('div');
      rowTriggerBtn.className = 'table-row-trigger-btn';
      rowTriggerBtn.title = '行操作';

      // 防止选中文本
      rowTriggerBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });

      firstCell.style.position = 'relative';
      firstCell.appendChild(rowTriggerBtn);

      // hover第一个单元格时显示按钮
      firstCell.addEventListener('mouseenter', () => {
        if (this.editingCellNodeId) return;
        rowTriggerBtn.style.display = 'flex';
      });

      firstCell.addEventListener('mouseleave', () => {
        setTimeout(() => {
          if (this.activeMenuButton === rowTriggerBtn) {
            return;
          }
          if (!rowTriggerBtn.matches(':hover')) {
            rowTriggerBtn.style.display = 'none';
          }
        }, 150);
      });

      rowTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        // 让按钮失去焦点，移除光标
        rowTriggerBtn.blur();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        const rect = rowTriggerBtn.getBoundingClientRect();

        // 先高亮当前行
        this.highlightTableRow(table, rowIndex, nodeId);
        
        // 然后设置当前按钮为激活状态
        this.activeMenuButton = rowTriggerBtn;
        rowTriggerBtn.style.display = 'flex';
        rowTriggerBtn.classList.add('active');

        if (this.onTableMenuTrigger) {
          this.onTableMenuTrigger(nodeId, 'row', rowIndex, rect);
        }
      });
    });

    // 为第一行的每个单元格添加列操作按钮
    const headerRow = rows[0];
    if (headerRow) {
      const cells = headerRow.querySelectorAll('td');
      cells.forEach((cell, colIndex) => {
        const cellEl = cell as HTMLElement;

        // 创建列操作触发按钮
        const colTriggerBtn = document.createElement('div');
        colTriggerBtn.className = 'table-col-trigger-btn';
        colTriggerBtn.title = '列操作';

        // 防止选中文本
        colTriggerBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
        });

        cellEl.style.position = 'relative';
        cellEl.appendChild(colTriggerBtn);

        cellEl.addEventListener('mouseenter', () => {
          if (this.editingCellNodeId) return;
          colTriggerBtn.style.display = 'flex';
        });

        cellEl.addEventListener('mouseleave', () => {
          setTimeout(() => {
            if (this.activeMenuButton === colTriggerBtn) {
              return;
            }
            if (!colTriggerBtn.matches(':hover')) {
              colTriggerBtn.style.display = 'none';
            }
          }, 150);
        });

        colTriggerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();

          // 让按钮失去焦点，移除光标
          colTriggerBtn.blur();
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }

          const rect = colTriggerBtn.getBoundingClientRect();

          // 先高亮当前列
          this.highlightTableColumn(table, colIndex, nodeId);
          
          // 然后设置当前按钮为激活状态
          this.activeMenuButton = colTriggerBtn;
          colTriggerBtn.style.display = 'flex';
          colTriggerBtn.classList.add('active');

          if (this.onTableMenuTrigger) {
            this.onTableMenuTrigger(nodeId, 'column', colIndex, rect);
          }
        });
      });
    }
  }

  /**
   * 保存表格单元格内容
   */
  private saveTableCell(nodeId: string, cell: HTMLElement, newContent: string): void {
    const rowIndex = parseInt(cell.dataset.row || '0', 10);
    const colIndex = parseInt(cell.dataset.col || '0', 10);

    const node = this.nodeDataCache.get(nodeId);
    if (!node?.config?.attachment?.table) return;

    const table = node.config.attachment.table;
    if (table.rows[rowIndex] && table.rows[rowIndex][colIndex]) {
      // 先调用回调保存历史（此时数据还是旧的），然后由回调来更新数据
      if (this.onTableUpdate) {
        // 创建表格数据的深拷贝，然后在拷贝中更新内容
        const updatedTable = JSON.parse(JSON.stringify(table));
        updatedTable.rows[rowIndex][colIndex].content = newContent;
        this.onTableUpdate(nodeId, updatedTable);
      }
    }
  }

  /**
   * 渲染代码块 HTML（带编辑功能）
   */
  private renderCodeBlockHTML(codeBlock: CodeBlockData, nodeId: string): string {
    const escapedCode = this.escapeHtml(codeBlock.code || '');
    
    return `
      <div class="node-code-block" data-node-id="${nodeId}" style="background-color: #37393a; border-radius: 4px; padding: 2px 6px; margin: 0 2px; display: inline-block; max-width: 390px;">
        <pre class="code-content" contenteditable="false" style="margin: 0; color: #e68a79; font-size: calc(1em - 2px); font-family: SourceCodePro, monospace; white-space: pre-wrap; word-break: break-word; outline: none; cursor: text;"><code>${escapedCode}</code></pre>
      </div>
    `;
  }

  /**
   * 绑定普通文本节点的编辑事件（绑定到 .node-content 元素）
   * 注意：双击事件已在 createNodeElement 中绑定到节点元素上
   */
  private bindTextEditEvents(element: HTMLElement, nodeId: string): void {
    const contentContainer = element.querySelector('.node-content') as HTMLElement;
    if (!contentContainer) return;

    // 使用标记避免重复绑定
    const bindKey = '_contentClickBound';
    if ((contentContainer as any)[bindKey]) return;
    (contentContainer as any)[bindKey] = true;

    // 点击内容区域进入编辑模式（当节点在 mousedown 时已选中）
    contentContainer.addEventListener('click', (e) => {
      // 检查节点在 mousedown 时是否已经被选中
      const wasSelected = this.wasNodeSelectedOnMouseDown.get(nodeId) || false;
      
      // 清除保存的状态
      this.wasNodeSelectedOnMouseDown.delete(nodeId);

      if (wasSelected) {
        e.stopPropagation();
        this.startEdit(nodeId, e.clientX, e.clientY);
      }
    });
  }

  /**
   * 绑定代码块编辑事件
   */
  private bindCodeBlockEvents(element: HTMLElement, nodeId: string): void {
    const codeContent = element.querySelector('.code-content') as HTMLElement;
    const codeBlockEl = element.querySelector('.node-code-block') as HTMLElement;
    if (!codeContent) return;

    // 阻止事件冒泡（包括整个代码块区域）
    if (codeBlockEl) {
      codeBlockEl.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      
      codeBlockEl.addEventListener('click', (e) => {
        e.stopPropagation();
        // 点击代码块任意位置都进入编辑模式
        startCodeEdit();
      });
    }

    codeContent.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    // 开始编辑的函数
    const startCodeEdit = () => {
      if (this.editingCellNodeId === nodeId) return; // 已经在编辑中
      
      this.editingCellNodeId = nodeId;
      codeContent.contentEditable = 'true';
      codeContent.focus();
      
      // 将光标移到末尾
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(codeContent);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    };

    // 单击开始编辑
    codeContent.addEventListener('click', (e) => {
      e.stopPropagation();
      startCodeEdit();
    });

    // 失去焦点保存
    codeContent.addEventListener('blur', () => {
      codeContent.contentEditable = 'false';
      this.editingCellNodeId = null;
      
      // 检查内容是否为空
      const newCode = codeContent.textContent?.trim() || '';
      if (!newCode) {
        // 内容为空，清除代码块附件
        if (this.onClearAttachment) {
          this.onClearAttachment(nodeId);
        }
      } else {
        this.saveCodeBlock(nodeId, codeContent);
      }
    });
    
    // 阻止键盘事件冒泡
    codeContent.addEventListener('keydown', (e) => {
      e.stopPropagation();
      
      // Escape 键退出编辑
      if (e.key === 'Escape') {
        codeContent.blur();
      }
    });
  }

  /**
   * 保存代码块内容
   */
  private saveCodeBlock(nodeId: string, codeElement: HTMLElement): void {
    const newCode = codeElement.textContent || '';

    const node = this.nodeDataCache.get(nodeId);
    if (!node?.config?.attachment?.codeBlock) return;

    const codeBlock = node.config.attachment.codeBlock;
    codeBlock.code = newCode;

    if (this.onCodeBlockUpdate) {
      this.onCodeBlockUpdate(nodeId, codeBlock);
    }
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 清除图片选中状态
   */
  public clearImageSelection(): void {
    this.imageResizeHandler.clearImageSelection();
  }
}

