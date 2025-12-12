export class PerformanceUtils {
  /**
   * 防抖函数
   * @param fn 要防抖的函数
   * @param delay 延迟时间（毫秒）
   */
  static debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: number | null = null;

    return function (this: any, ...args: Parameters<T>) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        fn.apply(this, args);
        timeoutId = null;
      }, delay);
    };
  }

  /**
   * 节流函数
   * @param fn 要节流的函数
   * @param interval 时间间隔（毫秒）
   */
  static throttle<T extends (...args: any[]) => any>(
    fn: T,
    interval: number
  ): (...args: Parameters<T>) => void {
    let lastTime = 0;
    let timeoutId: number | null = null;

    return function (this: any, ...args: Parameters<T>) {
      const now = Date.now();
      const remaining = interval - (now - lastTime);

      if (remaining <= 0) {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        lastTime = now;
        fn.apply(this, args);
      } else if (timeoutId === null) {
        timeoutId = window.setTimeout(() => {
          lastTime = Date.now();
          timeoutId = null;
          fn.apply(this, args);
        }, remaining);
      }
    };
  }

  /**
   * requestAnimationFrame 防抖
   * 确保函数在一帧内只执行一次
   */
  static rafDebounce<T extends (...args: any[]) => any>(
    fn: T
  ): (...args: Parameters<T>) => void {
    let rafId: number | null = null;

    return function (this: any, ...args: Parameters<T>) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        fn.apply(this, args);
        rafId = null;
      });
    };
  }

  /**
   * 批量执行任务调度器
   * 将多次调用合并为一次执行
   */
  static createBatchScheduler<T>(
    executor: (items: T[]) => void,
    delay: number = 0
  ) {
    let pending: T[] = [];
    let timeoutId: number | null = null;

    return {
      schedule(item: T) {
        pending.push(item);

        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }

        timeoutId = window.setTimeout(() => {
          const items = pending;
          pending = [];
          timeoutId = null;
          executor(items);
        }, delay);
      },

      flush() {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (pending.length > 0) {
          const items = pending;
          pending = [];
          executor(items);
        }
      },

      cancel() {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        pending = [];
      },
    };
  }

  /**
   * 测量函数执行时间
   */
  static measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  }

  /**
   * 异步测量
   */
  static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
}
