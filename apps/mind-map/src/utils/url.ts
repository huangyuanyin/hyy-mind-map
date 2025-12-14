/**
 * 验证 URL 是否有效
 */
export const isValidUrl = (url: string): boolean => {
  if (!url.trim()) return false;
  // 支持常见的 URL 格式
  const urlPattern = /^(https?:\/\/|mailto:|tel:|\/|#)/i;
  return urlPattern.test(url.trim());
};

/**
 * 自动补全 URL（如果没有协议，添加 https://）
 */
export const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  // 如果已经有协议或特殊前缀，直接返回
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

/**
 * 截断 URL 显示
 */
export const truncateUrl = (url: string, maxLength: number = 40): string => {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength) + '...';
};
