import type { Command } from '../types';
import type { MindMap } from '../../MindMap';

/**
 * 画布操作命令基类
 */
abstract class BaseCanvasCommand implements Command {
  public abstract id: string;
  public abstract name: string;
  public abstract description: string;

  constructor(protected mindMap: MindMap) {}

  public abstract execute(): void;

  public canExecute(): boolean {
    return true; // 画布命令通常总是可以执行
  }
}

/**
 * 画布放大命令
 * 快捷键：Cmd/Ctrl + +
 */
export class ZoomInCommand extends BaseCanvasCommand {
  public id = 'canvas.zoomIn';
  public name = '放大画布';
  public description = '放大画布视图';

  private zoomStep = 0.1; // 每次缩放 10%

  public execute(): void {
    const currentScale = this.mindMap.getScale();
    const newScale = Math.min(5, currentScale + this.zoomStep); // 最大 5 倍
    this.mindMap.setScale(newScale);
  }

  public canExecute(): boolean {
    return this.mindMap.getScale() < 5;
  }
}

/**
 * 画布缩小命令
 * 快捷键：Cmd/Ctrl + -
 */
export class ZoomOutCommand extends BaseCanvasCommand {
  public id = 'canvas.zoomOut';
  public name = '缩小画布';
  public description = '缩小画布视图';

  private zoomStep = 0.1; // 每次缩放 10%

  public execute(): void {
    const currentScale = this.mindMap.getScale();
    const newScale = Math.max(0.1, currentScale - this.zoomStep); // 最小 0.1 倍
    this.mindMap.setScale(newScale);
  }

  public canExecute(): boolean {
    return this.mindMap.getScale() > 0.1;
  }
}

/**
 * 重置缩放命令
 * 快捷键：Cmd/Ctrl + 0
 */
export class ZoomResetCommand extends BaseCanvasCommand {
  public id = 'canvas.zoomReset';
  public name = '重置缩放';
  public description = '将画布缩放重置为 100%';

  public execute(): void {
    this.mindMap.setScale(1);
  }
}

/**
 * 居中显示根节点命令
 * 快捷键：Cmd/Ctrl + Home
 */
export class CenterOnRootCommand extends BaseCanvasCommand {
  public id = 'canvas.centerOnRoot';
  public name = '居中显示根节点';
  public description = '将根节点居中显示在画布中';

  public execute(): void {
    this.mindMap.centerOnRoot();
  }

  public canExecute(): boolean {
    return this.mindMap.getRoot() !== null;
  }
}

/**
 * 适应画布命令
 * 快捷键：Cmd/Ctrl + 1
 */
export class FitToScreenCommand extends BaseCanvasCommand {
  public id = 'canvas.fitToScreen';
  public name = '适应画布';
  public description = '调整缩放使整个思维导图适应画布大小';

  public execute(): void {
    // TODO: 实现自动计算合适的缩放比例
    // 这需要计算整个思维导图的边界框，然后计算合适的缩放比例
    console.log('适应画布功能待实现');
  }
}
