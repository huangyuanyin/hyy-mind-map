import { ShortcutContext, type ShortcutConfig } from './types';
import type { MindMap } from '../MindMap';
import type { ShortcutManager } from './ShortcutManager';
import {
  InsertChildNodeCommand,
  InsertSiblingNodeCommand,
  InsertParentNodeCommand,
  DeleteNodeCommand,
  MoveNodeUpCommand,
  MoveNodeDownCommand,
  CopyNodeCommand,
  PasteNodeCommand,
  ToggleNodeExpandCommand,
  ToggleExpandAllCommand,
} from './commands/NodeCommands';
import {
  ZoomInCommand,
  ZoomOutCommand,
  ZoomResetCommand,
  CenterOnRootCommand,
} from './commands/CanvasCommands';
import {
  UndoCommand,
  RedoCommand,
} from './commands/HistoryCommands';

/**
 * 创建默认快捷键配置
 * @param mindMap - 思维导图实例
 * @param getShortcutManager - 获取快捷键管理器的函数
 */
export function createDefaultShortcuts(
  mindMap: MindMap,
  getShortcutManager: () => ShortcutManager
): ShortcutConfig[] {
  return [
    // ==================== 节点操作 ====================

    // 插入下级节点 - Tab
    {
      key: 'Tab',
      context: ShortcutContext.NODE_SELECTED,
      priority: 10,
      command: new InsertChildNodeCommand(mindMap),
    },

    // 插入下级节点 - Insert
    {
      key: 'Insert',
      context: ShortcutContext.NODE_SELECTED,
      priority: 10,
      command: new InsertChildNodeCommand(mindMap),
    },

    // 插入同级节点 - Enter
    {
      key: 'Enter',
      context: ShortcutContext.NODE_SELECTED,
      priority: 10,
      command: new InsertSiblingNodeCommand(mindMap),
    },

    // 插入父节点 - Shift+Tab
    {
      key: 'Shift+Tab',
      context: ShortcutContext.NODE_SELECTED,
      priority: 10,
      command: new InsertParentNodeCommand(mindMap),
    },

    // 删除节点 - Delete
    {
      key: 'Delete',
      context: ShortcutContext.NODE_SELECTED,
      priority: 10,
      command: new DeleteNodeCommand(mindMap),
    },

    // 删除节点 - Backspace
    {
      key: 'Backspace',
      context: ShortcutContext.NODE_SELECTED,
      priority: 10,
      command: new DeleteNodeCommand(mindMap),
    },

    // 上移节点 - Cmd/Ctrl+Up
    {
      key: 'Cmd+Up',
      macKey: 'Cmd+Up',
      winKey: 'Ctrl+Up',
      context: ShortcutContext.NODE_SELECTED,
      priority: 10,
      command: new MoveNodeUpCommand(mindMap),
    },

    // 下移节点 - Cmd/Ctrl+Down
    {
      key: 'Cmd+Down',
      macKey: 'Cmd+Down',
      winKey: 'Ctrl+Down',
      context: ShortcutContext.NODE_SELECTED,
      priority: 10,
      command: new MoveNodeDownCommand(mindMap),
    },

    // 复制节点 - Cmd/Ctrl+C
    {
      key: 'Cmd+c',
      macKey: 'Cmd+c',
      winKey: 'Ctrl+c',
      context: [ShortcutContext.NODE_SELECTED, ShortcutContext.GLOBAL],
      priority: 10,
      command: new CopyNodeCommand(mindMap, getShortcutManager),
    },

    // 粘贴节点 - Cmd/Ctrl+V
    {
      key: 'Cmd+v',
      macKey: 'Cmd+v',
      winKey: 'Ctrl+v',
      context: [ShortcutContext.NODE_SELECTED, ShortcutContext.GLOBAL],
      priority: 10,
      command: new PasteNodeCommand(mindMap, getShortcutManager),
    },

    // 切换展开/收起 - Space
    {
      key: ' ',
      context: ShortcutContext.NODE_SELECTED,
      priority: 10,
      command: new ToggleNodeExpandCommand(mindMap),
    },

    // 切换展开/收起 - Cmd/Ctrl + /
    {
      key: 'Cmd+/',
      macKey: 'Cmd+/',
      winKey: 'Ctrl+/',
      context: ShortcutContext.NODE_SELECTED,
      priority: 10,
      command: new ToggleNodeExpandCommand(mindMap),
    },

    // 切换展开/收起全部 - Cmd/Ctrl + Option/Alt + /
    {
      key: 'Cmd+Option+/',
      macKey: 'Cmd+Option+/',
      winKey: 'Ctrl+Alt+/',
      context: ShortcutContext.GLOBAL,
      priority: 10,
      command: new ToggleExpandAllCommand(mindMap),
    },

    // ==================== 画布操作 ====================

    // 放大画布 - Cmd/Ctrl + =
    {
      key: 'Cmd+=',
      macKey: 'Cmd+=',
      winKey: 'Ctrl+=',
      context: ShortcutContext.GLOBAL,
      priority: 5,
      command: new ZoomInCommand(mindMap),
    },

    // 缩小画布 - Cmd/Ctrl + -
    {
      key: 'Cmd+-',
      macKey: 'Cmd+-',
      winKey: 'Ctrl+-',
      context: ShortcutContext.GLOBAL,
      priority: 5,
      command: new ZoomOutCommand(mindMap),
    },

    // 重置缩放 - Cmd/Ctrl + 0
    {
      key: 'Cmd+0',
      macKey: 'Cmd+0',
      winKey: 'Ctrl+0',
      context: ShortcutContext.GLOBAL,
      priority: 5,
      command: new ZoomResetCommand(mindMap),
    },

    // 居中显示 - Cmd/Ctrl + Home
    {
      key: 'Cmd+Home',
      macKey: 'Cmd+Home',
      winKey: 'Ctrl+Home',
      context: ShortcutContext.GLOBAL,
      priority: 5,
      command: new CenterOnRootCommand(mindMap),
    },

    // ==================== 历史操作 ====================

    // 撤销 - Cmd/Ctrl + Z
    {
      key: 'Cmd+z',
      macKey: 'Cmd+z',
      winKey: 'Ctrl+z',
      context: ShortcutContext.GLOBAL,
      priority: 20, // 高优先级，确保撤销能正常工作
      command: new UndoCommand(mindMap),
    },

    // 重做 - Cmd/Ctrl + Shift + Z
    {
      key: 'Cmd+Shift+z',
      macKey: 'Cmd+Shift+z',
      winKey: 'Ctrl+Shift+z',
      context: ShortcutContext.GLOBAL,
      priority: 20,
      command: new RedoCommand(mindMap),
    },

    // 重做（备用）- Cmd/Ctrl + Y (Windows 常用)
    {
      key: 'Cmd+y',
      macKey: 'Cmd+y',
      winKey: 'Ctrl+y',
      context: ShortcutContext.GLOBAL,
      priority: 20,
      command: new RedoCommand(mindMap),
    },
  ];
}

/**
 * 快捷键分类（用于文档和 UI 展示）
 */
export const SHORTCUT_CATEGORIES = [
  {
    name: '通用操作',
    shortcuts: [
      { key: 'Cmd/Ctrl + Z', description: '撤销' },
      { key: 'Cmd/Ctrl + Shift + Z', description: '重做' },
      { key: 'Cmd/Ctrl + Y', description: '重做（备用）' },
    ],
  },
  {
    name: '节点操作',
    shortcuts: [
      { key: 'Tab / Insert', description: '插入下级节点' },
      { key: 'Enter', description: '插入同级节点' },
      { key: 'Shift + Tab', description: '插入父节点' },
      { key: 'Delete / Backspace', description: '删除节点' },
      { key: 'Cmd/Ctrl + ↑', description: '上移节点' },
      { key: 'Cmd/Ctrl + ↓', description: '下移节点' },
      { key: 'Cmd/Ctrl + C', description: '复制节点' },
      { key: 'Cmd/Ctrl + V', description: '粘贴节点' },
      { key: 'Space', description: '切换展开/收起' },
      { key: 'Cmd/Ctrl + /', description: '切换展开/收起节点' },
      { key: 'Cmd/Ctrl + Option/Alt + /', description: '展开/收起所有节点' },
    ],
  },
  {
    name: '画布操作',
    shortcuts: [
      { key: 'Cmd/Ctrl + +', description: '放大画布' },
      { key: 'Cmd/Ctrl + -', description: '缩小画布' },
      { key: 'Cmd/Ctrl + 0', description: '重置缩放（100%）' },
      { key: 'Cmd/Ctrl + Home', description: '居中显示根节点' },
      { key: '鼠标滚轮', description: '缩放画布' },
      { key: '空格 + 拖拽', description: '移动画布' },
    ],
  },
  {
    name: '选择与导航',
    shortcuts: [
      { key: '↑ / ↓ / ← / →', description: '选择上/下/左/右节点（规划中）' },
      { key: 'Esc', description: '取消选择（规划中）' },
    ],
  },
] as const;
