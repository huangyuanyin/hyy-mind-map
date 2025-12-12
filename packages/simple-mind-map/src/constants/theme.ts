import type { Theme } from '../types';

/**
 * 默认主题配置
 */
export const DEFAULT_THEME: Theme = {
  backgroundColor: '#fafafa',
  nodeBackgroundColor: '#e8f4f2',
  nodeBorderColor: '#549688',
  nodeTextColor: '#333333',
  nodeActiveBorderColor: '#1890ff',
  nodeHoverBackgroundColor: '#bde0d9',
  nodeSelectedBackgroundColor: '#a8d5cc',
  nodeSelectedBorderColor: '#1890ff',
  lineColor: '#549688',
  selectionRectColor: '#1890ff',
  selectionRectFillColor: 'rgba(24, 144, 255, 0.1)',
  fontSize: 14,
  fontFamily: 'Arial, sans-serif',
  padding: 12,
  borderWidth: 0,
  borderRadius: 8,
  lineWidth: 2,
} as const;

/**
 * 颜色亮度变体映射
 */
export const COLOR_LIGHT_VARIANTS: Record<string, string> = {
  '#549688': '#e8f4f2',
  '#1890ff': '#e6f7ff',
};

/**
 * 获取颜色的浅色版本
 * @param color - 原始颜色
 * @returns 浅色版本
 */
export function getLightColor(color: string): string {
  return COLOR_LIGHT_VARIANTS[color] ?? '#f0f0f0';
}

