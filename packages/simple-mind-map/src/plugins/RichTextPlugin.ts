import { Plugin, type PluginMetadata } from './PluginBase';
import { NodeDOMRenderer } from '../renderer/NodeDOMRenderer';
import type { Theme, RichContent } from '../types';

/**
 * RichText 插件配置选项
 */
export interface RichTextOptions {
  /** 主题配置 */
  theme?: Partial<Theme>;

  /** 启用加粗功能 */
  enableBold?: boolean;

  /** 启用斜体功能 */
  enableItalic?: boolean;

  /** 启用下划线功能 */
  enableUnderline?: boolean;

  /** 启用删除线功能 */
  enableStrikethrough?: boolean;

  /** 启用字号调整 */
  enableFontSize?: boolean;

  /** 启用文字颜色 */
  enableFontColor?: boolean;

  /** 启用背景颜色 */
  enableBackgroundColor?: boolean;
}

/**
 * RichText 插件
 */
export class RichTextPlugin extends Plugin {
  readonly metadata: PluginMetadata = {
    name: 'richText',
    version: '1.0.0',
    description: '富文本编辑支持（加粗、斜体、下划线、删除线、字体、字号、颜色、背景颜色）',
  };

  private nodeDOMRenderer: NodeDOMRenderer | null = null;
  private viewStateUnsubscribe: (() => void) | null = null;

  protected async onInit(): Promise<void> {
    const options = this.options as RichTextOptions;
    const { container } = this.context;

    // 1. 创建 NodeDOMRenderer
    this.nodeDOMRenderer = new NodeDOMRenderer(container, options?.theme);

    // 2. 设置回调函数
    this.setupCallbacks();

    // 3. 同步视图状态
    this.setupViewStateSync();

    // 4. 挂钩渲染循环
    this.hookIntoRenderCycle();

    // 5. 监听双击事件启动编辑
    this.context.eventSystem.on('node_dblclick', ({ node }) => {
      if (node && this.nodeDOMRenderer) {
        this.nodeDOMRenderer.startEdit(node.id);
      }
    });
  }

  protected async onDestroy(): Promise<void> {
    // 清理视图状态监听
    if (this.viewStateUnsubscribe) {
      this.viewStateUnsubscribe();
      this.viewStateUnsubscribe = null;
    }

    // 销毁 DOM 渲染器
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.destroy();
      this.nodeDOMRenderer = null;
    }
  }

  /**
   * 设置回调函数
   */
  private setupCallbacks(): void {
    if (!this.nodeDOMRenderer) return;

    // 编辑完成回调
    this.nodeDOMRenderer.setEditCompleteCallback((nodeId, content) => {
      this.handleEditComplete(nodeId, content);
    });

    // 节点点击回调
    this.nodeDOMRenderer.setNodeClickCallback((nodeId) => {
      const node = this.context.nodeManager.findNode(nodeId);
      if (node) {
        this.context.selectionService.setActiveNode(node);
        this.context.mindMap.scheduleRender();
      }
    });

    // 节点鼠标按下回调（用于拖拽）
    this.nodeDOMRenderer.setNodeMouseDownCallback((nodeId, event) => {
      const node = this.context.nodeManager.findNode(nodeId);
      if (node) {
        this.context.eventSystem.simulateNodeMouseDown(node, event);
      }
    });

    // 表格更新回调
    this.nodeDOMRenderer.setTableUpdateCallback((nodeId, table) => {
      const node = this.context.nodeManager.findNode(nodeId);
      if (node?.config?.attachment) {
        this.context.mindMap.saveHistory('updateTable', '更新表格');
        node.config.attachment.table = table;
        this.context.mindMap.relayout();
      }
    });

    // 代码块更新回调
    this.nodeDOMRenderer.setCodeBlockUpdateCallback((nodeId, codeBlock) => {
      const node = this.context.nodeManager.findNode(nodeId);
      if (node?.config?.attachment) {
        this.context.mindMap.saveHistory('updateCodeBlock', '更新代码块');
        node.config.attachment.codeBlock = codeBlock;
        this.context.mindMap.relayout();
      }
    });

    // 清除附件回调
    this.nodeDOMRenderer.setClearAttachmentCallback((nodeId) => {
      this.context.mindMap.saveHistory('clearAttachment', '清除附件');
      this.context.mindMap.clearNodeAttachment(nodeId);
    });

    // 表格菜单触发回调
    this.nodeDOMRenderer.setTableMenuTriggerCallback((nodeId, type, index, rect) => {
      this.context.eventSystem.emit('tableMenuTrigger', { nodeId, type, index, rect });
    });

    // 图片尺寸更新回调
    this.nodeDOMRenderer.setImageResizeCallback((nodeId, imageData) => {
      const node = this.context.nodeManager.findNode(nodeId);
      if (node?.config) {
        this.context.mindMap.saveHistory('resizeImage', '调整图片大小');
        node.config.image = imageData;
        this.context.mindMap.relayout();
      }
    });

    // 图片位置更新回调
    this.nodeDOMRenderer.setImagePositionCallback((nodeId, position) => {
      const node = this.context.nodeManager.findNode(nodeId);
      if (node?.config?.image) {
        this.context.mindMap.saveHistory('moveImage', '移动图片位置');
        node.config.image.position = position;
        this.context.mindMap.relayout();
      }
    });

    // 图片选中状态变化回调
    this.nodeDOMRenderer.setImageSelectChangeCallback((nodeId) => {
      this.context.renderer.setImageSelectedNodeId(nodeId);
      this.context.mindMap.scheduleRender();
    });

    // 图片预览回调
    this.nodeDOMRenderer.setImagePreviewCallback((imageData) => {
      this.context.eventSystem.emit('imagePreview', { imageData });
    });

    // 尺寸更新回调（当节点的实际尺寸与计算尺寸不同时，需要重新计算位置）
    this.nodeDOMRenderer.setOnSizeUpdateCallback(() => {
      const root = this.context.nodeManager.getRoot();
      if (!root) return;
      
      const rootCenterX = root.x + root.width / 2;
      const rootCenterY = root.y + root.height / 2;
      
      // 仅重新计算位置，不重新测量尺寸
      this.context.layoutEngine.layoutPositionsOnly(root, rootCenterX, rootCenterY);
      this.context.mindMap.render();
    });
  }

  /**
   * 同步视图状态
   */
  private setupViewStateSync(): void {
    if (!this.nodeDOMRenderer) return;

    this.viewStateUnsubscribe = this.context.stateManager.on('view:change', (state) => {
      const { scale, translateX, translateY } = state.view;
      this.nodeDOMRenderer!.setViewState(scale, translateX, translateY);
    });
  }

  /**
   * 挂钩渲染循环
   */
  private hookIntoRenderCycle(): void {
    if (!this.nodeDOMRenderer) return;

    // 在渲染后钩子中执行 DOM 渲染
    this.onAfterRender = (root) => {
      if (this.nodeDOMRenderer) {
        this.nodeDOMRenderer.render(root);
      }
    };
  }

  /**
   * 处理编辑完成
   */
  private handleEditComplete(nodeId: string, content: RichContent): void {
    const result = this.context.nodeService.updateNodeText(nodeId, content.text || '');
    if (result.success && result.node) {
      result.node.richContent = {
        html: content.html,
        text: content.text,
      };
      this.context.mindMap.relayout();
    }
  }

  // ==================== 公共 API ====================

  /**
   * 启动节点编辑
   */
  startEdit(nodeId: string): void {
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.startEdit(nodeId);
    }
  }

  /**
   * 结束编辑
   */
  endEdit(): void {
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.endEdit();
    }
  }

  /**
   * 检查是否正在编辑
   */
  isEditing(): boolean {
    return this.nodeDOMRenderer?.isEditing() || false;
  }

  /**
   * 获取当前编辑的节点 ID
   */
  getEditingNodeId(): string | null {
    return this.nodeDOMRenderer?.getEditingNodeId() || null;
  }

  /**
   * 清除表格高亮
   */
  clearTableHighlight(): void {
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.clearTableHighlight();
    }
  }

  /**
   * 清除图片选中状态
   */
  clearImageSelection(): void {
    if (this.nodeDOMRenderer) {
      this.nodeDOMRenderer.clearImageSelection();
    }
  }

  /**
   * 应用文本格式到选中文本
   */
  applyFormatting(format: 'bold' | 'italic' | 'underline' | 'strikethrough'): void {
    document.execCommand(format, false);
  }

  /**
   * 设置选中文本的字号
   */
  setFontSize(size: number): void {
    document.execCommand('fontSize', false, String(size));
  }

  /**
   * 设置选中文本的颜色
   */
  setTextColor(color: string): void {
    document.execCommand('foreColor', false, color);
  }

  /**
   * 设置选中文本的背景颜色
   */
  setBackgroundColor(color: string): void {
    document.execCommand('backColor', false, color);
  }
}
