import type { MindMap } from '../MindMap';
import type { StateManager } from '../core/StateManager';
import type { NodeManager } from '../core/NodeManager';
import type { EventSystem } from '../events/EventSystem';
import type { NodeService } from '../services/NodeService';
import type { ViewService } from '../services/ViewService';
import type { SelectionService } from '../services/SelectionService';
import type { CompositeRenderer } from '../renderer/CompositeRenderer';
import type { LayoutEngine } from '../layout/LayoutEngine';
import type { HistoryManager } from '../history/HistoryManager';
import type { HyyMindMapNode } from '../core/HyyMindMapNode';
import type { NodeData } from '../types';

/**
 * 插件生命周期钩子枚举
 */
export enum PluginLifecycle {
  BEFORE_INIT = 'beforeInit',
  AFTER_INIT = 'afterInit',
  BEFORE_RENDER = 'beforeRender',
  AFTER_RENDER = 'afterRender',
  BEFORE_DATA_CHANGE = 'beforeDataChange',
  AFTER_DATA_CHANGE = 'afterDataChange',
  ON_USER_INTERACTION = 'onUserInteraction',
  BEFORE_DESTROY = 'beforeDestroy',
}

/**
 * 插件上下文 - 提供对 MindMap 内部组件的访问
 */
export interface PluginContext {
  /** MindMap 实例 */
  mindMap: MindMap;

  /** 状态管理器 */
  stateManager: StateManager;

  /** 节点管理器 */
  nodeManager: NodeManager;

  /** 事件系统 */
  eventSystem: EventSystem;

  /** 节点服务 */
  nodeService: NodeService;

  /** 视图服务 */
  viewService: ViewService;

  /** 选择服务 */
  selectionService: SelectionService;

  /** 渲染器 */
  renderer: CompositeRenderer;

  /** 布局引擎 */
  layoutEngine: LayoutEngine;

  /** 历史管理器 */
  historyManager: HistoryManager;

  /** DOM 容器 */
  container: HTMLElement;

  /** Canvas 元素 */
  canvas: HTMLCanvasElement;
}

/**
 * 插件元数据
 */
export interface PluginMetadata {
  /** 插件唯一名称 */
  name: string;

  /** 插件版本号 */
  version: string;

  /** 插件描述 */
  description?: string;

  /** 依赖的其他插件名称列表 */
  dependencies?: string[];

  /** 冲突的插件名称列表 */
  conflicts?: string[];
}

/**
 * 插件基类
 */
export abstract class Plugin {
  /** 插件元数据 */
  abstract readonly metadata: PluginMetadata;

  /** 插件上下文 */
  protected context!: PluginContext;

  /** 插件选项 */
  protected options: any;

  /** 插件状态 */
  private _isInitialized = false;
  private _isDestroyed = false;

  constructor(options?: any) {
    this.options = options;
  }

  /**
   * 设置插件上下文
   */
  setContext(context: PluginContext): void {
    this.context = context;
  }

  /**
   * 初始化插件
   */
  async init(): Promise<void> {
    if (this._isInitialized) {
      throw new Error(`Plugin ${this.metadata.name} is already initialized`);
    }

    await this.onInit();
    this._isInitialized = true;
  }

  /**
   * 销毁插件
   */
  async destroy(): Promise<void> {
    if (this._isDestroyed) return;

    await this.onDestroy();
    this._isDestroyed = true;
  }

  /**
   * 获取插件初始化状态
   */
  isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * 获取插件销毁状态
   */
  isDestroyed(): boolean {
    return this._isDestroyed;
  }

  // ==================== 生命周期钩子 ====================

  /**
   * 插件初始化钩子
   */
  protected abstract onInit(): Promise<void> | void;

  /**
   * 插件销毁钩子
   */
  protected abstract onDestroy(): Promise<void> | void;

  /**
   * 渲染前钩子
   */
  onBeforeRender?(root: HyyMindMapNode | null): void;

  /**
   * 渲染后钩子
   */
  onAfterRender?(root: HyyMindMapNode | null): void;

  /**
   * 数据变更前钩子
   */
  onBeforeDataChange?(data: NodeData): void;

  /**
   * 数据变更后钩子
   */
  onAfterDataChange?(data: NodeData): void;

  /**
   * 用户交互钩子
   */
  onUserInteraction?(event: string, data: any): void;
}
