import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { NodeData, TextMeasurement, Rect } from './index';

/**
 * 渲染器接口
 */
export interface IRenderer {
  /** 设置变换矩阵 */
  setTransform(scale: number, translateX: number, translateY: number): void;
  /** 设置框选矩形 */
  setSelectionRect(rect: Rect | null): void;
  /** 渲染思维导图 */
  render(root: HyyMindMapNode | null): void;
  /** 测量文本尺寸 */
  measureText(text: string, icons?: Record<string, string> | string, fontSize?: number): TextMeasurement;
  /** 测量表格尺寸 */
  measureTable(table: { rows: { content: string }[][] }): TextMeasurement;
  /** 测量代码块尺寸 */
  measureCodeBlock(codeBlock: { code: string; language: string }): TextMeasurement;
  /** 更新离屏Canvas尺寸 */
  updateOffscreenCanvas(): void;
}

/**
 * 节点管理器接口
 */
export interface INodeManager {
  /** 设置根节点 */
  setRoot(data: NodeData): HyyMindMapNode;
  /** 获取根节点 */
  getRoot(): HyyMindMapNode | null;
  /** 获取所有节点 */
  getAllNodes(): HyyMindMapNode[];
  /** 根据ID查找节点 */
  findNode(id: string): HyyMindMapNode | null;
  /** 添加节点 */
  addNode(parentId: string, data: NodeData): HyyMindMapNode | null;
  /** 删除节点 */
  removeNode(id: string): boolean;
  /** 更新节点文本 */
  updateNode(id: string, text: string): boolean;
  /** 清空所有节点 */
  clear(): void;
}

/**
 * 事件系统接口
 */
export interface IEventSystem {
  /** 设置视图状态 */
  setViewState(scale: number, translateX: number, translateY: number): void;
  /** 解绑事件 */
  unbindEvents(): void;
  /** 订阅事件 */
  on(event: string, handler: (data: any) => void): void;
  /** 取消订阅 */
  off(event: string, handler: (data: any) => void): void;
  /** 获取选中的节点 */
  getSelectedNodes(): HyyMindMapNode[];
  /** 获取框选矩形 */
  getSelectionRect(): Rect | null;
  /** 清除选择 */
  clearSelection(): void;
}

/**
 * 布局引擎接口
 */
export interface ILayoutEngine {
  /** 计算布局 */
  layout(root: HyyMindMapNode, centerX: number, centerY: number): void;
  /** 获取子树高度 */
  getSubtreeHeight(node: HyyMindMapNode): number;
}

/**
 * 快捷键管理器接口
 */
export interface IShortcutManager {
  /** 注册快捷键 */
  register(config: any): void;
  /** 批量注册快捷键 */
  registerAll(configs: any[]): void;
  /** 设置上下文 */
  setContext(context: string): void;
  /** 开始监听 */
  startListening(target?: HTMLElement | Window): void;
  /** 停止监听 */
  stopListening(target?: HTMLElement | Window): void;
  /** 启用 */
  enable(): void;
  /** 禁用 */
  disable(): void;
  /** 销毁 */
  destroy(): void;
  /** 设置剪贴板 */
  setClipboard(data: any): void;
  /** 获取剪贴板 */
  getClipboard(): any;
}


