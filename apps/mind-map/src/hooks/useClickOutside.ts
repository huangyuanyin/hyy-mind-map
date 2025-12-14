import { useEffect, RefObject } from 'react';

/**
 * 点击外部元素时触发回调的自定义 Hook
 * @param ref - 需要监听的元素引用
 * @param handler - 点击外部时的回调函数
 * @param enabled - 是否启用监听（默认 true）
 * @param delay - 延迟启动监听的时间（毫秒，默认 100）
 */
export const useClickOutside = <T extends HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent) => void,
  enabled: boolean = true,
  delay: number = 100
): void => {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler(event);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, delay);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, handler, enabled, delay]);
};
