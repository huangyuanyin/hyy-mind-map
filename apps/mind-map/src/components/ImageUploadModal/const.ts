/**
 * 上传状态常量
 */
export const UPLOAD_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type UploadStatus =
  (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS];

/**
 * Tab 类型
 */
export const TAB_TYPE = {
  UPLOAD: 'upload',
  EMBED: 'embed',
} as const;

export type TabType = (typeof TAB_TYPE)[keyof typeof TAB_TYPE];
