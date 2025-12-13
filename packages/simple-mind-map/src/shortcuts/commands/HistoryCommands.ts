import type { Command } from '../types';
import type { MindMap } from '../../MindMap';

/**
 * 撤销命令
 * 快捷键：Cmd/Ctrl + Z
 */
export class UndoCommand implements Command {
  public id = 'history.undo';
  public name = '撤销';
  public description = '撤销上一步操作';

  constructor(private mindMap: MindMap) {}

  public execute(): void {
    this.mindMap.undo();
  }

  public canExecute(): boolean {
    return this.mindMap.canUndo();
  }
}

/**
 * 重做命令
 * 快捷键：Cmd/Ctrl + Shift + Z 或 Cmd/Ctrl + Y
 */
export class RedoCommand implements Command {
  public id = 'history.redo';
  public name = '重做';
  public description = '重做上一步被撤销的操作';

  constructor(private mindMap: MindMap) {}

  public execute(): void {
    this.mindMap.redo();
  }

  public canExecute(): boolean {
    return this.mindMap.canRedo();
  }
}

