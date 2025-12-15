/**
 * 存储键常量
 */
export const STORAGE_KEYS = {
  /** 思维导图数据 */
  MIND_MAP_DATA: 'mind-map-data',
  /** 视图状态 */
  VIEW_STATE: 'mind-map-view-state',
  /** 主题 */
  THEME: 'mind-map-theme',
} as const;

/**
 * 默认思维导图数据
 */
export const DEFAULT_MIND_MAP_DATA = {
  id: 'root',
  text: '中心主题',
  children: [
    {
      id: 'child1',
      text: '分支主题 1',
      children: [
        {
          id: 'child1-1',
          text: '子主题 1-1',
        },
        {
          id: 'child1-2',
          text: '子主题 1-2',
        },
      ],
    },
    {
      id: 'child2',
      text: '分支主题 2',
      children: [
        {
          id: 'child2-1',
          text: '子主题 2-1',
          children: [
            {
              id: 'child2-1-1',
              text: '子主题 2-1-1',
            },
          ],
        },
      ],
    },
    {
      id: 'child3',
      text: '分支主题 3',
    },
    {
      id: 'child4',
      text: '分支主题 4',
      children: [
        {
          id: 'child4-1',
          text: '子主题 4-1',
        },
      ],
    },
  ],
};

/**
 * 自动保存防抖延迟
 */
export const AUTO_SAVE_DEBOUNCE_MS = 500;

/**
 * 默认主题 ID
 */
export const DEFAULT_THEME_ID = 'classic-teal';
