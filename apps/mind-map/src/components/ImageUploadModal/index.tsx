import React, { useState, useRef } from 'react';
import { Modal, Message, Input } from '@arco-design/web-react';
import { handleImageUpload, loadImageFromUrl } from '@/helpers/imageHelper';
import type { ImageData } from 'hyy-mind-map';
import { UPLOAD_STATUS, TAB_TYPE, type UploadStatus, type TabType } from './const';
import UploadIcon from '@/assets/icons/ui/upload.svg?react';
import LinkIcon from '@/assets/icons/ui/link-alt.svg?react';
import styles from './index.module.css';

interface ImageUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (imageData: ImageData) => void;
}

/**
 * 图片上传弹窗组件
 */
export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  visible,
  onClose,
  onUpload,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(TAB_TYPE.UPLOAD);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(UPLOAD_STATUS.IDLE);
  const [embedUrl, setEmbedUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    try {
      setUploadStatus(UPLOAD_STATUS.UPLOADING);
      const imageData = await handleImageUpload(file);
      setUploadStatus(UPLOAD_STATUS.SUCCESS);
      onUpload(imageData);
      Message.success('图片上传成功');
      handleClose();
    } catch (error) {
      setUploadStatus(UPLOAD_STATUS.ERROR);
      Message.error(error instanceof Error ? error.message : '上传失败');
    }
  };

  const handleAreaClick = () => {
    if (uploadStatus === UPLOAD_STATUS.UPLOADING) return;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (uploadStatus === UPLOAD_STATUS.UPLOADING) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadStatus !== UPLOAD_STATUS.UPLOADING) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleEmbedSubmit = async () => {
    if (!embedUrl.trim()) {
      Message.warning('请输入图片链接');
      return;
    }

    try {
      setIsLoadingUrl(true);
      const imageData = await loadImageFromUrl(embedUrl.trim());
      onUpload(imageData);
      handleClose();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '图片加载失败');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleClose = () => {
    setUploadStatus(UPLOAD_STATUS.IDLE);
    setIsDragOver(false);
    setEmbedUrl('');
    setActiveTab(TAB_TYPE.UPLOAD);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const isUploading = uploadStatus === UPLOAD_STATUS.UPLOADING;
  const canEmbed = embedUrl.trim().length > 0 && !isLoadingUrl;

  return (
    <Modal
      visible={visible}
      onCancel={handleClose}
      footer={null}
      title={null}
      closable={false}
      className={styles.modal}
      style={{ width: 420 }}
      focusLock={false}
      unmountOnExit
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>图片</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            ×
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === TAB_TYPE.UPLOAD ? styles.active : ''}`}
            onClick={() => setActiveTab(TAB_TYPE.UPLOAD)}
          >
            <UploadIcon width={16} height={16} />
            上传图片
          </button>
          <button
            className={`${styles.tab} ${activeTab === TAB_TYPE.EMBED ? styles.active : ''}`}
            onClick={() => setActiveTab(TAB_TYPE.EMBED)}
          >
            <LinkIcon width={16} height={16} />
            嵌入链接
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === TAB_TYPE.UPLOAD && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
                disabled={isUploading}
              />

              <div
                className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''} ${isUploading ? styles.uploading : ''}`}
                onClick={handleAreaClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className={styles.iconStack}>
                  <div className={styles.iconBg} style={{ transform: 'rotate(-8deg)', background: '#E8F5E9' }}>
                    <span>🖼️</span>
                  </div>
                  <div className={styles.iconBg} style={{ transform: 'rotate(8deg)', background: '#E3F2FD' }}>
                    <span>🎨</span>
                  </div>
                  <div className={styles.iconBg} style={{ background: '#FFF3E0' }}>
                    <span>📷</span>
                  </div>
                </div>
                <p className={styles.dropText}>
                  {isUploading ? '上传中...' : '拖放图片到此处，或点击选择'}
                </p>
                <p className={styles.dropHint}>
                  JPG、PNG、GIF、SVG、WebP · 最大 10MB
                </p>
              </div>
            </>
          )}

          {activeTab === TAB_TYPE.EMBED && (
            <div className={styles.embedSection}>
              <Input
                className={styles.urlInput}
                placeholder="粘贴图片链接..."
                value={embedUrl}
                onChange={setEmbedUrl}
                onPressEnter={handleEmbedSubmit}
                disabled={isLoadingUrl}
                size="large"
              />
              <p className={styles.embedHint}>
                支持 HTTPS 图片链接
              </p>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnSecondary} onClick={handleClose}>
            取消
          </button>
          <button
            className={styles.btnPrimary}
            onClick={activeTab === TAB_TYPE.UPLOAD ? handleAreaClick : handleEmbedSubmit}
            disabled={activeTab === TAB_TYPE.EMBED ? !canEmbed : isUploading}
          >
            {isLoadingUrl ? '加载中...' : '确定'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
