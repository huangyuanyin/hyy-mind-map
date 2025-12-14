import type {
  ShortcutContext,
  ShortcutConfig,
  KeyInfo,
  ShortcutManagerOptions,
} from './types';

export class ShortcutManager {
  /** 快捷键配置列表（按优先级排序） */
  private shortcuts: ShortcutConfig[] = [];

  /** 当前激活的上下文栈（支持多层上下文） */
  private contextStack: ShortcutContext[] = [];

  /** 配置选项 */
  private options: Required<ShortcutManagerOptions>;

  /** 当前平台 */
  private platform: 'mac' | 'win' | 'linux';

  /** 事件监听器引用（用于清理） */
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  /** 剪贴板数据存储 */
  private clipboard: any = null;

  constructor(options: ShortcutManagerOptions = {}) {
    this.options = {
      enabled: options.enabled ?? true,
      debug: options.debug ?? false,
      platform: options.platform ?? this.detectPlatform(),
    };

    this.platform = this.options.platform;
    this.contextStack = []; // 初始化为空，由外部设置
  }

  /**
   * 检测当前平台
   */
  private detectPlatform(): 'mac' | 'win' | 'linux' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) return 'mac';
    if (userAgent.includes('win')) return 'win';
    return 'linux';
  }

  /**
   * 注册快捷键
   */
  public register(config: ShortcutConfig): void {
    // 设置默认值
    const fullConfig: ShortcutConfig = {
      ...config,
      priority: config.priority ?? 0,
      preventDefault: config.preventDefault ?? true,
      stopPropagation: config.stopPropagation ?? true,
    };

    this.shortcuts.push(fullConfig);

    // 按优先级排序（高优先级在前）
    this.shortcuts.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * 批量注册快捷键
   */
  public registerAll(configs: ShortcutConfig[]): void {
    configs.forEach(config => this.register(config));
  }

  /**
   * 注销快捷键
   */
  public unregister(commandId: string): void {
    const index = this.shortcuts.findIndex(s => s.command.id === commandId);
    if (index !== -1) {
      this.shortcuts.splice(index, 1);
    }
  }

  /**
   * 设置当前上下文
   */
  public setContext(context: ShortcutContext): void {
    this.contextStack = [context];
  }

  /**
   * 推入新上下文（支持上下文栈）
   */
  public pushContext(context: ShortcutContext): void {
    this.contextStack.push(context);
  }

  /**
   * 弹出上下文
   */
  public popContext(): void {
    this.contextStack.pop();
  }

  /**
   * 获取当前上下文
   */
  public getCurrentContext(): ShortcutContext | undefined {
    return this.contextStack[this.contextStack.length - 1];
  }

  /**
   * 开始监听键盘事件
   */
  public startListening(target: HTMLElement | Window = window): void {
    if (this.keydownHandler) {
      return;
    }

    this.keydownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    target.addEventListener('keydown', this.keydownHandler as EventListener);
  }

  /**
   * 停止监听键盘事件
   */
  public stopListening(target: HTMLElement | Window = window): void {
    if (this.keydownHandler) {
      target.removeEventListener('keydown', this.keydownHandler as EventListener);
      this.keydownHandler = null;
    }
  }

  /**
   * 处理键盘按下事件
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.options.enabled) return;

    // 解析按键信息
    const keyInfo = this.parseKeyEvent(e);

    // 按优先级匹配快捷键
    for (const shortcut of this.shortcuts) {
      // 检查快捷键是否匹配
      if (!this.matchKey(shortcut, keyInfo)) {
        continue;
      }

      // 检查上下文是否匹配
      if (!this.matchContext(shortcut)) {
        continue;
      }

      // 检查命令是否可执行
      if (shortcut.command.canExecute && !shortcut.command.canExecute()) {
        continue;
      }

      if (shortcut.preventDefault) {
        e.preventDefault();
      }
      if (shortcut.stopPropagation) {
        e.stopPropagation();
      }

      shortcut.command.execute();

      // 匹配成功后停止
      return;
    }
  }

  /**
   * 解析键盘事件为 KeyInfo
   */
  private parseKeyEvent(e: KeyboardEvent): KeyInfo {
    const key = e.key;
    const ctrl = e.ctrlKey;
    const shift = e.shiftKey;
    const alt = e.altKey;
    const meta = e.metaKey;

    // 标准化按键名称
    let normalizedKey = this.normalizeKeyName(key);

    // 构建快捷键字符串
    const parts: string[] = [];

    // 在 Mac 上，Cmd 对应 meta，在 Windows/Linux 上 Ctrl 对应 ctrl
    if (this.platform === 'mac') {
      if (meta) parts.push('Cmd');
      if (ctrl) parts.push('Ctrl');
    } else {
      if (ctrl) parts.push('Ctrl');
      if (meta) parts.push('Meta');
    }

    if (shift) parts.push('Shift');
    if (alt) parts.push('Alt');
    parts.push(normalizedKey);

    const normalized = parts.join('+');

    return { key, ctrl, shift, alt, meta, normalized };
  }

  /**
   * 标准化按键名称
   */
  private normalizeKeyName(key: string): string {
    // 特殊键映射
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Escape': 'Esc',
      'Delete': 'Delete',
      'Backspace': 'Backspace',
      'Enter': 'Enter',
      'Tab': 'Tab',
    };

    return keyMap[key] || key;
  }

  /**
   * 检查快捷键是否匹配
   */
  private matchKey(shortcut: ShortcutConfig, keyInfo: KeyInfo): boolean {
    // 根据平台选择快捷键
    let targetKey = shortcut.key;
    if (this.platform === 'mac' && shortcut.macKey) {
      targetKey = shortcut.macKey;
    } else if (this.platform !== 'mac' && shortcut.winKey) {
      targetKey = shortcut.winKey;
    }

    return targetKey === keyInfo.normalized;
  }

  /**
   * 检查上下文是否匹配
   */
  private matchContext(shortcut: ShortcutConfig): boolean {
    const currentContext = this.getCurrentContext();

    // 如果没有当前上下文，只匹配 GLOBAL
    if (!currentContext) {
      const contexts = Array.isArray(shortcut.context) ? shortcut.context : [shortcut.context];
      return contexts.includes('global' as any); // GLOBAL 上下文
    }

    const contexts = Array.isArray(shortcut.context) ? shortcut.context : [shortcut.context];

    // 检查是否匹配当前上下文或 GLOBAL 上下文
    return contexts.includes(currentContext) || contexts.includes('global' as any);
  }

  /**
   * 获取所有已注册的快捷键
   */
  public getAllShortcuts(): ShortcutConfig[] {
    return [...this.shortcuts];
  }

  /**
   * 根据上下文获取快捷键
   */
  public getShortcutsByContext(context: ShortcutContext): ShortcutConfig[] {
    return this.shortcuts.filter(s => {
      const contexts = Array.isArray(s.context) ? s.context : [s.context];
      return contexts.includes(context);
    });
  }

  /**
   * 启用快捷键系统
   */
  public enable(): void {
    this.options.enabled = true;
  }

  /**
   * 禁用快捷键系统
   */
  public disable(): void {
    this.options.enabled = false;
  }

  /**
   * 设置剪贴板数据
   */
  public setClipboard(data: any): void {
    this.clipboard = data;
  }

  /**
   * 获取剪贴板数据
   */
  public getClipboard(): any {
    return this.clipboard;
  }

  /**
   * 销毁快捷键管理器
   */
  public destroy(): void {
    this.stopListening();
    this.shortcuts = [];
    this.contextStack = [];
    this.clipboard = null;
  }
}
