import { Plugin, PluginLifecycle, type PluginContext } from './PluginBase';

/**
 * 插件类构造函数类型
 */
export type PluginClass = new (options?: any) => Plugin;

/**
 * 插件注册信息
 */
export interface PluginRegistration {
  pluginClass: PluginClass;
  options?: any;
}

/**
 * 插件管理器
 */
export class PluginManager {
  /** 静态插件注册表 */
  private static registry: Map<string, PluginRegistration> = new Map();

  /** 实例插件映射 */
  private plugins: Map<string, Plugin> = new Map();

  /** 插件上下文 */
  private context!: PluginContext;

  // ==================== 静态方法（全局注册） ====================

  /**
   * 静态注册插件
   */
  static register(pluginClass: PluginClass, options?: any): void {
    const tempInstance = new pluginClass();
    const { name, conflicts } = tempInstance.metadata;

    // 检查冲突
    if (conflicts) {
      for (const conflict of conflicts) {
        if (this.registry.has(conflict)) {
          throw new Error(
            `Plugin ${name} conflicts with already registered plugin ${conflict}`
          );
        }
      }
    }

    // 检查是否已注册
    if (this.registry.has(name)) {
      console.warn(`[PluginManager] Plugin ${name} is already registered. Overwriting.`);
    }

    this.registry.set(name, { pluginClass, options });
  }

  /**
   * 取消注册插件
   */
  static unregister(pluginName: string): void {
    this.registry.delete(pluginName);
  }

  /**
   * 获取插件注册表
   */
  static getRegistry(): Map<string, PluginRegistration> {
    return new Map(this.registry);
  }

  /**
   * 清空插件注册表
   */
  static clearRegistry(): void {
    this.registry.clear();
  }

  // ==================== 实例方法 ====================

  /**
   * 初始化所有已注册的插件
   */
  async initializePlugins(context: PluginContext): Promise<void> {
    this.context = context;

    // 获取注册表
    const registry = PluginManager.getRegistry();

    // 按依赖关系排序
    const sorted = this.sortByDependencies(Array.from(registry.entries()));

    // 按顺序初始化插件
    for (const [name, registration] of sorted) {
      await this.initializePlugin(name, registration);
    }
  }

  /**
   * 初始化单个插件
   */
  private async initializePlugin(
    name: string,
    registration: PluginRegistration
  ): Promise<void> {
    const { pluginClass, options } = registration;

    try {
      // 创建插件实例
      const plugin = new pluginClass(options);

      // 检查依赖
      const { dependencies } = plugin.metadata;
      if (dependencies) {
        for (const dep of dependencies) {
          if (!this.plugins.has(dep)) {
            throw new Error(
              `Plugin ${name} depends on ${dep}, but ${dep} is not registered`
            );
          }
        }
      }

      // 设置上下文
      plugin.setContext(this.context);

      // 初始化
      await plugin.init();

      // 存储插件
      this.plugins.set(name, plugin);

      console.log(`[PluginManager] Plugin ${name} initialized successfully`);
    } catch (error) {
      console.error(`[PluginManager] Failed to initialize plugin ${name}:`, error);
      throw error;
    }
  }

  /**
   * 拓扑排序（处理插件依赖关系）
   */
  private sortByDependencies(
    entries: [string, PluginRegistration][]
  ): [string, PluginRegistration][] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // 构建依赖图
    for (const [name, registration] of entries) {
      const tempInstance = new registration.pluginClass();
      const deps = tempInstance.metadata.dependencies || [];

      graph.set(name, deps);
      inDegree.set(name, 0);
    }

    // 计算入度
    for (const [_, deps] of graph) {
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    // Kahn 算法拓扑排序
    const queue: string[] = [];
    const result: [string, PluginRegistration][] = [];

    for (const [name, degree] of inDegree) {
      if (degree === 0) {
        queue.push(name);
      }
    }

    while (queue.length > 0) {
      const name = queue.shift()!;
      const registration = entries.find(([n]) => n === name);

      if (registration) {
        result.push(registration);
      }

      const deps = graph.get(name) || [];
      for (const dep of deps) {
        const newDegree = (inDegree.get(dep) || 0) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          queue.push(dep);
        }
      }
    }

    // 检查循环依赖
    if (result.length !== entries.length) {
      throw new Error('[PluginManager] Circular dependency detected in plugins');
    }

    return result;
  }

  /**
   * 获取插件实例
   */
  getPlugin<T extends Plugin>(name: string): T | undefined {
    return this.plugins.get(name) as T | undefined;
  }

  /**
   * 检查插件是否已加载
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * 触发生命周期事件到所有插件
   */
  emitLifecycle(lifecycle: PluginLifecycle, ...args: any[]): void {
    for (const plugin of this.plugins.values()) {
      try {
        switch (lifecycle) {
          case PluginLifecycle.BEFORE_RENDER:
            if (plugin.onBeforeRender) {
              plugin.onBeforeRender(args[0]);
            }
            break;
          case PluginLifecycle.AFTER_RENDER:
            if (plugin.onAfterRender) {
              plugin.onAfterRender(args[0]);
            }
            break;
          case PluginLifecycle.BEFORE_DATA_CHANGE:
            if (plugin.onBeforeDataChange) {
              plugin.onBeforeDataChange(args[0]);
            }
            break;
          case PluginLifecycle.AFTER_DATA_CHANGE:
            if (plugin.onAfterDataChange) {
              plugin.onAfterDataChange(args[0]);
            }
            break;
          case PluginLifecycle.ON_USER_INTERACTION:
            if (plugin.onUserInteraction) {
              plugin.onUserInteraction(args[0], args[1]);
            }
            break;
        }
      } catch (error) {
        console.error(
          `[PluginManager] Error in plugin ${plugin.metadata.name} lifecycle ${lifecycle}:`,
          error
        );
      }
    }
  }

  /**
   * 销毁所有插件（按逆序）
   */
  async destroyAll(): Promise<void> {
    const plugins = Array.from(this.plugins.values()).reverse();

    for (const plugin of plugins) {
      try {
        await plugin.destroy();
        console.log(`[PluginManager] Plugin ${plugin.metadata.name} destroyed`);
      } catch (error) {
        console.error(
          `[PluginManager] Error destroying plugin ${plugin.metadata.name}:`,
          error
        );
      }
    }

    this.plugins.clear();
  }
}
