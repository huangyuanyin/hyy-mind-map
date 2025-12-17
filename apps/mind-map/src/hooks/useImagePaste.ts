import { useEffect } from 'react';
import { Message } from '@arco-design/web-react';
import { handleImageUpload } from '@/helpers/imageHelper';
import type { ImageData } from 'hyy-mind-map';

/**
 * 图片粘贴 Hook
 */
export const useImagePaste = (
  enabled: boolean,
  onImagePaste: (imageData: ImageData) => void
) => {
  useEffect(() => {
    if (!enabled) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();
          if (!file) continue;

          try {
            const imageData = await handleImageUpload(file);
            onImagePaste(imageData);
          } catch (error) {
            console.error('Failed to paste image:', error);
            Message.error(
              error instanceof Error ? error.message : '粘贴图片失败'
            );
          }

          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [enabled, onImagePaste]);
};
