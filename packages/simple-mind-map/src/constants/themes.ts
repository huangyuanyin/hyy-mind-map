import { DEFAULT_THEME } from './theme';
import type { Theme } from '../types';

/**
 * 主题预设接口
 */
export interface ThemePreset {
  /** 主题唯一标识 */
  id: string;
  /** 主题显示名称 */
  name: string;
  /** 主题描述 */
  description?: string;
  /** 完整的主题配置 */
  theme: Theme;
  /** 预览元数据，用于生成缩略图 */
  preview: {
    primaryColor: string; // 主要颜色（节点边框色）
    backgroundColor: string; // 画布背景色
  };
}

/**
 * 内置主题集合
 */
export const BUILT_IN_THEMES: ThemePreset[] = [
  {
    id: 'classic-teal',
    name: '经典-青绿',
    description: '清新的青绿色调，适合日常使用',
    theme: { ...DEFAULT_THEME },
    preview: {
      primaryColor: '#549688',
      backgroundColor: '#fafafa',
    },
  },
  {
    id: 'sky-blue',
    name: '天空-蔚蓝',
    description: '明亮的蓝色系，专业清爽',
    theme: {
      backgroundColor: '#f0f5ff',
      nodeBackgroundColor: '#e6f7ff',
      nodeBorderColor: '#1890ff',
      nodeTextColor: '#262626',
      nodeActiveBorderColor: '#1890ff',
      nodeHoverBackgroundColor: '#bae7ff',
      nodeSelectedBackgroundColor: '#91d5ff',
      nodeSelectedBorderColor: '#1890ff',
      lineColor: '#1890ff',
      selectionRectColor: '#1890ff',
      selectionRectFillColor: 'rgba(24, 144, 255, 0.1)',
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      padding: 12,
      borderWidth: 0,
      borderRadius: 8,
      lineWidth: 2,
    },
    preview: {
      primaryColor: '#1890ff',
      backgroundColor: '#f0f5ff',
    },
  },
  {
    id: 'warm-orange',
    name: '暖阳-橙色',
    description: '温暖的橙色调，活力四射',
    theme: {
      backgroundColor: '#fffbf0',
      nodeBackgroundColor: '#fff7e6',
      nodeBorderColor: '#fa8c16',
      nodeTextColor: '#262626',
      nodeActiveBorderColor: '#fa8c16',
      nodeHoverBackgroundColor: '#ffe7ba',
      nodeSelectedBackgroundColor: '#ffd591',
      nodeSelectedBorderColor: '#fa8c16',
      lineColor: '#fa8c16',
      selectionRectColor: '#fa8c16',
      selectionRectFillColor: 'rgba(250, 140, 22, 0.1)',
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      padding: 12,
      borderWidth: 0,
      borderRadius: 8,
      lineWidth: 2,
    },
    preview: {
      primaryColor: '#fa8c16',
      backgroundColor: '#fffbf0',
    },
  },
  {
    id: 'forest-green',
    name: '森林-墨绿',
    description: '自然的绿色系，沉稳舒适',
    theme: {
      backgroundColor: '#fcffe6',
      nodeBackgroundColor: '#f6ffed',
      nodeBorderColor: '#52c41a',
      nodeTextColor: '#262626',
      nodeActiveBorderColor: '#52c41a',
      nodeHoverBackgroundColor: '#d9f7be',
      nodeSelectedBackgroundColor: '#b7eb8f',
      nodeSelectedBorderColor: '#52c41a',
      lineColor: '#52c41a',
      selectionRectColor: '#52c41a',
      selectionRectFillColor: 'rgba(82, 196, 26, 0.1)',
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      padding: 12,
      borderWidth: 0,
      borderRadius: 8,
      lineWidth: 2,
    },
    preview: {
      primaryColor: '#52c41a',
      backgroundColor: '#fcffe6',
    },
  },
  {
    id: 'ocean-blue',
    name: '海洋-深蓝',
    description: '深邃的蓝色系，宁静专注',
    theme: {
      backgroundColor: '#e6f7ff',
      nodeBackgroundColor: '#e6fffb',
      nodeBorderColor: '#13c2c2',
      nodeTextColor: '#262626',
      nodeActiveBorderColor: '#13c2c2',
      nodeHoverBackgroundColor: '#b5f5ec',
      nodeSelectedBackgroundColor: '#87e8de',
      nodeSelectedBorderColor: '#13c2c2',
      lineColor: '#13c2c2',
      selectionRectColor: '#13c2c2',
      selectionRectFillColor: 'rgba(19, 194, 194, 0.1)',
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      padding: 12,
      borderWidth: 0,
      borderRadius: 8,
      lineWidth: 2,
    },
    preview: {
      primaryColor: '#13c2c2',
      backgroundColor: '#e6f7ff',
    },
  },
  {
    id: 'sunset-purple',
    name: '日落-紫红',
    description: '浪漫的紫红色调，独特优雅',
    theme: {
      backgroundColor: '#fff7fa',
      nodeBackgroundColor: '#fff0f6',
      nodeBorderColor: '#eb2f96',
      nodeTextColor: '#262626',
      nodeActiveBorderColor: '#eb2f96',
      nodeHoverBackgroundColor: '#ffd6e7',
      nodeSelectedBackgroundColor: '#ffadd2',
      nodeSelectedBorderColor: '#eb2f96',
      lineColor: '#eb2f96',
      selectionRectColor: '#eb2f96',
      selectionRectFillColor: 'rgba(235, 47, 150, 0.1)',
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      padding: 12,
      borderWidth: 0,
      borderRadius: 8,
      lineWidth: 2,
    },
    preview: {
      primaryColor: '#eb2f96',
      backgroundColor: '#fff7fa',
    },
  },
  {
    id: 'business-gray',
    name: '商务-深灰',
    description: '专业的灰色系，简洁大方',
    theme: {
      backgroundColor: '#f5f5f5',
      nodeBackgroundColor: '#fafafa',
      nodeBorderColor: '#595959',
      nodeTextColor: '#262626',
      nodeActiveBorderColor: '#1890ff',
      nodeHoverBackgroundColor: '#f0f0f0',
      nodeSelectedBackgroundColor: '#e0e0e0',
      nodeSelectedBorderColor: '#1890ff',
      lineColor: '#8c8c8c',
      selectionRectColor: '#1890ff',
      selectionRectFillColor: 'rgba(24, 144, 255, 0.1)',
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      padding: 12,
      borderWidth: 0,
      borderRadius: 8,
      lineWidth: 2,
    },
    preview: {
      primaryColor: '#595959',
      backgroundColor: '#f5f5f5',
    },
  },
  {
    id: 'tech-purple',
    name: '科技-深紫',
    description: '科技感的紫色系，现代时尚',
    theme: {
      backgroundColor: '#fafafa',
      nodeBackgroundColor: '#f9f0ff',
      nodeBorderColor: '#722ed1',
      nodeTextColor: '#262626',
      nodeActiveBorderColor: '#722ed1',
      nodeHoverBackgroundColor: '#efdbff',
      nodeSelectedBackgroundColor: '#d3adf7',
      nodeSelectedBorderColor: '#722ed1',
      lineColor: '#722ed1',
      selectionRectColor: '#722ed1',
      selectionRectFillColor: 'rgba(114, 46, 209, 0.1)',
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      padding: 12,
      borderWidth: 0,
      borderRadius: 8,
      lineWidth: 2,
    },
    preview: {
      primaryColor: '#722ed1',
      backgroundColor: '#fafafa',
    },
  },
];
