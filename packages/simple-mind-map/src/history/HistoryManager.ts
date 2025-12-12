import type { NodeData } from '../types';

/**
 * 历史记录项
 */
export interface HistoryRecord {
  /** 操作类型 */
  type: string;
  /** 操作描述 */
  description: string;
  /** 操作前的完整数据快照 */
  snapshot: NodeData;
  /** 操作时间戳 */
  timestamp: number;
}

/**
 * 历史管理器配置
 */
export interface HistoryManagerOptions {
  /** 最大历史记录数量，默认 50 */
  maxHistorySize?: number;
  /** 是否启用调试日志，默认 false */
  debug?: boolean;
}

/**
 * 历史管理器
 */
export class HistoryManager {
  /** 撤销栈 */
  private undoStack: HistoryRecord[] = [];
  
  /** 重做栈 */
  private redoStack: HistoryRecord[] = [];
  
  /** 配置选项 */
  private options: Required<HistoryManagerOptions>;
  
  /** 历史变化监听器 */
  private changeListeners: Set<() => void> = new Set();

  constructor(options: HistoryManagerOptions = {}) {
    this.options = {
      maxHistorySize: options.maxHistorySize ?? 50,
      debug: options.debug ?? false,
    };
  }

  /**
   * 保存操作到历史记录
   * 在执行操作前调用，保存操作前的状态
   */
  public saveState(type: string, description: string, snapshot: NodeData): void {
    const record: HistoryRecord = {
      type,
      description,
      snapshot: this.deepClone(snapshot),
      timestamp: Date.now(),
    };

    this.undoStack.push(record);

    // 限制历史记录数量
    if (this.undoStack.length > this.options.maxHistorySize) {
      this.undoStack.shift();
    }

    // 执行新操作后清空重做栈
    this.redoStack = [];

    if (this.options.debug) {
      console.log('[HistoryManager] State saved:', description, 'Undo stack size:', this.undoStack.length);
    }

    this.notifyChange();
  }

  /**
   * 撤销操作
   * @param getCurrentData 获取当前数据的回调函数
   * @returns 返回撤销后应该恢复的数据，如果无法撤销则返回 null
   */
  public undo(getCurrentData: () => NodeData | null): NodeData | null {
    if (this.undoStack.length === 0) {
      if (this.options.debug) {
        console.log('[HistoryManager] Nothing to undo');
      }
      return null;
    }

    const currentData = getCurrentData();
    if (!currentData) {
      return null;
    }

    // 弹出最近的操作记录
    const record = this.undoStack.pop()!;

    // 将当前状态保存到重做栈
    this.redoStack.push({
      type: record.type,
      description: `重做: ${record.description}`,
      snapshot: this.deepClone(currentData),
      timestamp: Date.now(),
    });

    if (this.options.debug) {
      console.log('[HistoryManager] Undo:', record.description);
    }

    this.notifyChange();
    return record.snapshot;
  }

  /**
   * 重做操作
   * @param getCurrentData 获取当前数据的回调函数
   * @returns 返回重做后应该恢复的数据，如果无法重做则返回 null
   */
  public redo(getCurrentData: () => NodeData | null): NodeData | null {
    if (this.redoStack.length === 0) {
      if (this.options.debug) {
        console.log('[HistoryManager] Nothing to redo');
      }
      return null;
    }

    const currentData = getCurrentData();
    if (!currentData) {
      return null;
    }

    // 弹出最近的重做记录
    const record = this.redoStack.pop()!;

    // 将当前状态保存到撤销栈
    this.undoStack.push({
      type: record.type,
      description: record.description.replace('重做: ', ''),
      snapshot: this.deepClone(currentData),
      timestamp: Date.now(),
    });

    if (this.options.debug) {
      console.log('[HistoryManager] Redo:', record.description);
    }

    this.notifyChange();
    return record.snapshot;
  }

  /**
   * 是否可以撤销
   */
  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 是否可以重做
   */
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 获取撤销栈长度
   */
  public getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * 获取重做栈长度
   */
  public getRedoStackSize(): number {
    return this.redoStack.length;
  }

  /**
   * 清空所有历史记录
   */
  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];

    if (this.options.debug) {
      console.log('[HistoryManager] History cleared');
    }

    this.notifyChange();
  }

  /**
   * 添加历史变化监听器
   */
  public onChange(callback: () => void): () => void {
    this.changeListeners.add(callback);
    return () => {
      this.changeListeners.delete(callback);
    };
  }

  /**
   * 通知历史变化
   */
  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      listener();
    }
  }

  /**
   * 深拷贝对象
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * 销毁历史管理器
   */
  public destroy(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.changeListeners.clear();
  }
}

