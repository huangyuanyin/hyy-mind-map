/**
 * 快捷键上下文枚举
 * 用于区分不同场景下的快捷键
 */
export enum ShortcutContext {
  /** 全局快捷键 - 任何时候都可用 */
  GLOBAL = 'global',
  /** 节点已选中 - 有节点被选中时可用 */
  NODE_SELECTED = 'node_selected',
  /** 节点编辑中 - 正在编辑节点文本时 */
  NODE_EDITING = 'node_editing',
  /** 画布操作 - 在画布上操作时 */
  CANVAS = 'canvas',
  /** 多选状态 - 选中多个节点时 */
  MULTI_SELECT = 'multi_select',
}

/**
 * 命令接口
 */
export interface Command {
  /** 命令唯一标识 */
  id: string;
  /** 命令名称 */
  name: string;
  /** 命令描述 */
  description: string;
  /** 执行命令 */
  execute(): void;
  /** 撤销命令（可选） */
  undo?(): void;
  /** 判断命令是否可执行 */
  canExecute?(): boolean;
}

/**
 * 快捷键配置接口
 */
export interface ShortcutConfig {
  /** 快捷键组合，如 'Tab', 'Cmd+C', 'Shift+Tab' */
  key: string;
  /** macOS 专用快捷键（可选） */
  macKey?: string;
  /** Windows/Linux 专用快捷键（可选） */
  winKey?: string;
  /** 快捷键生效的上下文 */
  context: ShortcutContext | ShortcutContext[];
  /** 优先级，数字越大优先级越高，默认为 0 */
  priority?: number;
  /** 关联的命令 */
  command: Command;
  /** 是否阻止默认行为，默认为 true */
  preventDefault?: boolean;
  /** 是否阻止事件冒泡，默认为 true */
  stopPropagation?: boolean;
}

/**
 * 键盘事件信息
 */
export interface KeyInfo {
  /** 原始键值 */
  key: string;
  /** 是否按下 Ctrl */
  ctrl: boolean;
  /** 是否按下 Shift */
  shift: boolean;
  /** 是否按下 Alt */
  alt: boolean;
  /** 是否按下 Meta (Command/Windows) */
  meta: boolean;
  /** 标准化后的快捷键字符串 */
  normalized: string;
}

/**
 * 快捷键管理器配置
 */
export interface ShortcutManagerOptions {
  /** 是否启用快捷键，默认为 true */
  enabled?: boolean;
  /** 是否在控制台输出调试信息，默认为 false */
  debug?: boolean;
  /** 自定义平台检测（用于测试） */
  platform?: 'mac' | 'win' | 'linux';
}
