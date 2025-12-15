import { Plugin, type PluginMetadata } from './PluginBase';
import { DEFAULT_THEME } from '../constants/theme';
import type { Theme } from '../types';
import type { RichTextPlugin } from './RichTextPlugin';

/**
 * Theme 插件配置选项
 */
export interface ThemeOptions {
  /** 初始主题配置 */
  initialTheme?: Partial<Theme>;

  /** 预定义主题集合 */
  themes?: Record<string, Partial<Theme>>;

  /** 是否允许动态切换（默认 true） */
  allowDynamicSwitch?: boolean;
}

/**
 * Theme 插件
 */
export class ThemePlugin extends Plugin {
  readonly metadata: PluginMetadata = {
    name: 'theme',
    version: '1.0.0',
    description: '动态主题管理',
  };

  private currentTheme: Theme = DEFAULT_THEME;
  private themes: Map<string, Partial<Theme>> = new Map();

  protected async onInit(): Promise<void> {
    const options = (this.options || {}) as ThemeOptions;

    // 加载预定义主题
    if (options.themes) {
      for (const [name, theme] of Object.entries(options.themes)) {
        this.themes.set(name, theme);
      }
    }

    // 应用初始主题
    if (options.initialTheme) {
      this.applyTheme(options.initialTheme);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.themes.clear();
  }

  // ==================== 公共 API ====================

  /**
   * 注册一个主题
   */
  registerTheme(name: string, theme: Partial<Theme>): void {
    this.themes.set(name, theme);
  }

  /**
   * 切换到已注册的主题
   */
  switchTheme(name: string): boolean {
    const theme = this.themes.get(name);
    if (!theme) {
      console.warn(`[ThemePlugin] Theme ${name} not found`);
      return false;
    }

    this.applyTheme(theme);
    return true;
  }

  /**
   * 应用主题配置
   */
  applyTheme(theme: Partial<Theme>): void {
    // 合并主题
    this.currentTheme = { ...this.currentTheme, ...theme };

    // 更新 Canvas 渲染器主题
    (this.context.renderer as any).theme = this.currentTheme;

    // 更新 DOM 渲染器主题（如果 RichTextPlugin 已激活）
    const richTextPlugin = this.context.mindMap.getPlugin<RichTextPlugin>('richText');
    if (richTextPlugin) {
      const domRenderer = (richTextPlugin as any).nodeDOMRenderer;
      if (domRenderer) {
        (domRenderer as any).theme = this.currentTheme;
      }
    }

    // 触发重新渲染
    this.context.mindMap.scheduleRender();
  }

  /**
   * 获取当前主题
   */
  getCurrentTheme(): Theme {
    return { ...this.currentTheme };
  }

  /**
   * 获取所有已注册的主题名称
   */
  getThemes(): string[] {
    return Array.from(this.themes.keys());
  }

  /**
   * 更新主题的部分属性
   */
  updateTheme(updates: Partial<Theme>): void {
    this.applyTheme(updates);
  }
}
