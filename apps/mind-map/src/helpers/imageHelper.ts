import type { ImageData } from 'hyy-mind-map';

/** 支持的图片格式 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/svg+xml',
  'image/webp',
];

/** 最大文件大小 (10MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** 最大图片尺寸 */
export const MAX_IMAGE_DIMENSION = 2048;

/** 默认显示宽度 */
export const DEFAULT_DISPLAY_WIDTH = 200;

/** 压缩质量 */
export const COMPRESSION_QUALITY = 0.9;

/**
 * 验证图片文件
 */
export const validateImageFile = (
  file: File
): {
  valid: boolean;
  error?: string;
} => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `不支持的文件格式，仅支持 JPG、PNG、GIF、SVG、WebP`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `文件大小不能超过 10MB，当前文件 ${sizeMB}MB`,
    };
  }

  return { valid: true };
};

/**
 * 将文件转换为 Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * 加载图片并获取尺寸
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });
};

/**
 * 计算缩放后的尺寸
 */
const calculateScaledSize = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.floor(width * ratio),
    height: Math.floor(height * ratio),
  };
};

/**
 * 计算显示尺寸
 */
const calculateDisplaySize = (
  width: number,
  height: number
): { displayWidth: number; displayHeight: number } => {
  const displayWidth = Math.min(width, DEFAULT_DISPLAY_WIDTH);
  const aspectRatio = height / width;
  return {
    displayWidth,
    displayHeight: Math.floor(displayWidth * aspectRatio),
  };
};

/**
 * 使用 Canvas 处理图片
 */
const processImageWithCanvas = (
  img: HTMLImageElement,
  width: number,
  height: number,
  format: string,
  quality?: number
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 初始化失败');
  }

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL(format, quality);
};

/**
 * 压缩图片
 */
export const compressImage = async (
  base64: string,
  maxWidth = MAX_IMAGE_DIMENSION,
  maxHeight = MAX_IMAGE_DIMENSION,
  quality = COMPRESSION_QUALITY
): Promise<{ base64: string; width: number; height: number }> => {
  const img = await loadImage(base64);
  const { width, height } = calculateScaledSize(img.width, img.height, maxWidth, maxHeight);
  const compressedBase64 = processImageWithCanvas(img, width, height, 'image/jpeg', quality);

  return { base64: compressedBase64, width, height };
};

/**
 * 智能压缩策略
 */
export const smartCompress = async (
  base64: string,
  originalSize: number
): Promise<{ base64: string; width: number; height: number }> => {
  // 小于 500KB 的图片不压缩，只获取尺寸
  if (originalSize < 500 * 1024) {
    const img = await loadImage(base64);
    return { base64, width: img.width, height: img.height };
  }

  // 500KB - 2MB：轻度压缩
  if (originalSize < 2 * 1024 * 1024) {
    return compressImage(base64, 1920, 1920, 0.9);
  }

  // 2MB - 5MB：中度压缩
  if (originalSize < 5 * 1024 * 1024) {
    return compressImage(base64, 1440, 1440, 0.85);
  }

  // 5MB 以上：高度压缩
  return compressImage(base64, 1024, 1024, 0.8);
};

/**
 * 构建 ImageData 对象
 */
const buildImageData = (
  base64: string,
  width: number,
  height: number,
  fileName: string
): ImageData => {
  const { displayWidth, displayHeight } = calculateDisplaySize(width, height);
  return {
    base64,
    fileName,
    width,
    height,
    displayWidth,
    displayHeight,
    uploadTime: Date.now(),
  };
};

/**
 * 处理图片上传
 */
export const handleImageUpload = async (file: File): Promise<ImageData> => {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const base64 = await fileToBase64(file);
  const compressed = await smartCompress(base64, file.size);

  return buildImageData(compressed.base64, compressed.width, compressed.height, file.name);
};

/**
 * 获取图片的实际显示尺寸
 */
export const getImageDisplaySize = (
  imageData: ImageData
): { width: number; height: number } => {
  const width = imageData.displayWidth || DEFAULT_DISPLAY_WIDTH;
  const height = imageData.displayHeight || 
    Math.floor(width * ((imageData.height || 1) / (imageData.width || 1)));
  return { width, height };
};

/**
 * 从 URL 加载图片
 */
export const loadImageFromUrl = async (url: string): Promise<ImageData> => {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  const loadedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败，请检查链接是否正确'));
    img.src = url;
  });

  const { width, height } = calculateScaledSize(
    loadedImg.width,
    loadedImg.height,
    MAX_IMAGE_DIMENSION,
    MAX_IMAGE_DIMENSION
  );

  const base64 = processImageWithCanvas(loadedImg, width, height, 'image/png');
  const fileName = url.split('/').pop() || 'image';

  return buildImageData(base64, width, height, fileName);
};
