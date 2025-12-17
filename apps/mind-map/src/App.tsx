import { useState, useCallback, useEffect } from 'react';
import { Message } from '@arco-design/web-react';
import '@arco-design/web-react/dist/css/arco.css';
import {
  useMindMap,
  useContextMenu,
  useNodeOperations,
  useHyperlinkManager,
  useTableMenuManager,
  useTableOperations,
  useImagePaste,
} from './hooks';
import type { NodeStyle } from './hooks';
import type { TableOperationType, ImageData } from 'hyy-mind-map';

import { PhotoSlider } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import { ZoomIn, ZoomOut, Undo, Redo, Download } from 'iconoir-react';

import { Toolbar } from './components/Toolbar';
import { ZoomControl } from './components/ZoomControl';
import { ContextMenu } from './components/ContextMenu';
import { IconSelector } from './components/IconSelector';
import { NodeFormatToolbar } from './components/NodeFormatToolbar';
import { HyperlinkPopover } from './components/HyperlinkPopover';
import { HyperlinkPreview } from './components/HyperlinkPreview';
import { TableMenu } from './components/TableMenu';
import { ImageUploadModal } from './components/ImageUploadModal';
import './App.css';

// 配置 Message 组件位置
Message.config({
  maxCount: 1,
  duration: 2000,
});

function App() {
  const [iconSelectorVisible, setIconSelectorVisible] = useState<boolean>(false);
  const [imageModalVisible, setImageModalVisible] = useState<boolean>(false);
  // 节点样式状态 - 仅用于 useNodeOperations 同步更新
  const [, setLocalNodeStyle] = useState<NodeStyle>({});
  // 图片预览状态
  const [imagePreviewState, setImagePreviewState] = useState<{
    visible: boolean;
    imageData: ImageData | null;
  }>({ visible: false, imageData: null });

  // 思维导图核心状态
  const {
    mindMapRef,
    containerRef,
    scale,
    hasSelectedNode,
    activeNodeId,
    isRootNode,
    nodeStyle,
    currentThemeId,
    handleThemeChange,
    handleZoomIn,
    handleZoomOut,
  } = useMindMap();

  // 节点操作
  const nodeOps = useNodeOperations(
    mindMapRef,
    activeNodeId,
    hasSelectedNode,
    isRootNode,
    setLocalNodeStyle
  );

  // 右键菜单
  const contextMenu = useContextMenu(mindMapRef);

  // 超链接管理
  const hyperlink = useHyperlinkManager({ mindMapRef, activeNodeId });

  // 表格菜单管理
  const tableMenu = useTableMenuManager(mindMapRef);
  const { executeTableOperation } = useTableOperations(mindMapRef);

  // 表格操作处理
  const handleTableOperation = useCallback(
    (operation: TableOperationType) => {
      if (!tableMenu.menuState.nodeId) return;
      executeTableOperation(
        tableMenu.menuState.nodeId,
        operation,
        tableMenu.menuState.index
      );
      tableMenu.closeMenu(true);
    },
    [tableMenu, executeTableOperation]
  );

  // 处理节点样式变更
  const handleNodeStyleChange = useCallback((nodeId: string, style: NodeStyle) => {
    nodeOps.handleStyleChange(nodeId, style);
  }, [nodeOps]);

  // 处理插入表格
  const handleInsertTable = useCallback((nodeId: string) => {
    nodeOps.handleInsertTable(nodeId);
  }, [nodeOps]);

  // 处理插入代码块
  const handleInsertCodeBlock = useCallback((nodeId: string) => {
    nodeOps.handleInsertCodeBlock(nodeId);
  }, [nodeOps]);

  // 处理图标选择
  const handleIconSelect = useCallback((icons: Record<string, string>) => {
    nodeOps.handleIconSelect(icons);
  }, [nodeOps]);

  // 打开样式面板
  const handleOpenStylePanel = useCallback(() => {
    setIconSelectorVisible(true);
  }, []);

  // 关闭样式面板
  const handleCloseStylePanel = useCallback(() => {
    setIconSelectorVisible(false);
  }, []);

  // 获取当前节点的图标
  const getCurrentNodeIcons = useCallback(() => {
    if (!mindMapRef.current || !activeNodeId) return {};
    const node = mindMapRef.current.getNodeManager().findNode(activeNodeId);
    return node?.config?.icons || {};
  }, [mindMapRef, activeNodeId]);

  const handleOpenImageUpload = useCallback(() => {
    if (!hasSelectedNode) {
      Message.warning('请先选择一个节点');
      return;
    }
    mindMapRef.current?.disableInteraction();
    setImageModalVisible(true);
  }, [hasSelectedNode]);

  const handleImageUpload = useCallback(
    (imageData: ImageData) => {
      if (!mindMapRef.current || !activeNodeId) return;

      const node = mindMapRef.current.getNodeManager().findNode(activeNodeId);
      if (!node) return;

      mindMapRef.current.updateNodeConfig(activeNodeId, {
        ...node.config,
        image: imageData,
      });

      Message.success('图片已添加到节点');
    },
    [mindMapRef, activeNodeId]
  );

  // 启用粘贴图片功能
  useImagePaste(hasSelectedNode, (imageData) => {
    if (activeNodeId) {
      handleImageUpload(imageData);
    }
  });

  useEffect(() => {
    if (!mindMapRef.current) return;

    const eventSystem = mindMapRef.current.getEventSystem();
    const handleImagePreview = (data: { imageData?: ImageData }) => {
      if (data.imageData) {
        setImagePreviewState({
          visible: true,
          imageData: data.imageData,
        });
      }
    };

    eventSystem.on('imagePreview', handleImagePreview);

    return () => {
      eventSystem.off('imagePreview', handleImagePreview);
    };
  }, []);

  const handleCloseImagePreview = useCallback(() => {
    setImagePreviewState({ visible: false, imageData: null });
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 画布区域 */}
      <div
        ref={containerRef}
        onContextMenu={contextMenu.openMenu}
        style={{
          width: '100%',
          height: '100%',
          background: '#fafafa',
          position: 'relative',
        }}
      >
        {/* 节点工具栏 */}
        <Toolbar
          hasSelectedNode={hasSelectedNode}
          isRootNode={isRootNode}
          onDelete={nodeOps.handleDelete}
          onAddSibling={nodeOps.handleAddSibling}
          onAddChild={nodeOps.handleAddChild}
          onOpenStyle={handleOpenStylePanel}
          onOpenImageUpload={handleOpenImageUpload}
        />

        {/* 缩放控制面板 */}
        <ZoomControl
          scale={scale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />

        {/* 右键菜单 */}
        <ContextMenu
          visible={contextMenu.menuState.visible}
          position={contextMenu.menuState.position}
          type={contextMenu.menuState.type}
          canPaste={contextMenu.menuState.canPaste}
          isRootNode={contextMenu.menuState.isRootNode}
          onCenterOnRoot={contextMenu.handleCenterOnRoot}
          onExpandAll={contextMenu.handleExpandAll}
          onCollapseAll={contextMenu.handleCollapseAll}
          onInsertChild={contextMenu.handleInsertChild}
          onInsertSibling={contextMenu.handleInsertSibling}
          onInsertParent={contextMenu.handleInsertParent}
          onDelete={contextMenu.handleDeleteNode}
          onCopy={contextMenu.handleCopyNode}
          onPaste={contextMenu.handlePasteNode}
        />

        {/* 节点格式化工具栏 */}
        <NodeFormatToolbar
          visible={hasSelectedNode}
          nodeId={activeNodeId}
          currentStyle={nodeStyle}
          onStyleChange={handleNodeStyleChange}
          onInsertTable={handleInsertTable}
          onInsertCodeBlock={handleInsertCodeBlock}
          onInsertHyperlink={hyperlink.openInsertPopover}
          onClose={() => {}}
        />

        {/* 超链接输入悬浮框 */}
        <HyperlinkPopover
          visible={hyperlink.popoverState.visible}
          mode={hyperlink.popoverState.mode}
          hasSelectedText={hyperlink.popoverState.hasSelectedText}
          selectedText={hyperlink.popoverState.selectedText}
          initialText={hyperlink.popoverState.initialText}
          initialUrl={hyperlink.popoverState.initialUrl}
          position={hyperlink.popoverState.position}
          onConfirm={hyperlink.confirmHyperlink}
          onDelete={hyperlink.deleteHyperlink}
          onClose={hyperlink.closePopover}
        />

        {/* 超链接预览悬浮框 */}
        <HyperlinkPreview
          visible={hyperlink.previewState.visible}
          url={hyperlink.previewState.url}
          text={hyperlink.previewState.text}
          position={hyperlink.previewState.position}
          onEdit={hyperlink.openEditPopover}
          onDelete={hyperlink.deleteHyperlink}
          onClose={hyperlink.closePreview}
          onMouseEnter={() => {
            hyperlink.isHoveringPreviewRef.current = true;
          }}
          onMouseLeave={() => {
            hyperlink.isHoveringPreviewRef.current = false;
            hyperlink.closePreview();
          }}
        />

        {/* 表格菜单 */}
        {tableMenu.menuState.visible && tableMenu.menuState.type && (
          <TableMenu
            visible={tableMenu.menuState.visible}
            type={tableMenu.menuState.type}
            position={tableMenu.menuState.position}
            canDelete={tableMenu.menuState.canDelete}
            onInsertBefore={() => {
              const op = tableMenu.menuState.type === 'row' ? 'insertRowBefore' : 'insertColumnBefore';
              handleTableOperation(op);
            }}
            onInsertAfter={() => {
              const op = tableMenu.menuState.type === 'row' ? 'insertRowAfter' : 'insertColumnAfter';
              handleTableOperation(op);
            }}
            onDelete={() => {
              const op = tableMenu.menuState.type === 'row' ? 'deleteRow' : 'deleteColumn';
              handleTableOperation(op);
            }}
            onMouseEnter={() => {
              tableMenu.isHoveringMenuRef.current = true;
            }}
            onMouseLeave={() => {
              tableMenu.isHoveringMenuRef.current = false;
            }}
          />
        )}

        {/* 样式面板 */}
        {iconSelectorVisible && (
          <IconSelector
            onSelect={handleIconSelect}
            onClose={handleCloseStylePanel}
            initialIcons={getCurrentNodeIcons()}
            onThemeChange={handleThemeChange}
            currentThemeId={currentThemeId}
            hasSelectedNode={hasSelectedNode}
          />
        )}

        {/* 图片上传弹窗 */}
        <ImageUploadModal
          visible={imageModalVisible}
          onClose={() => {
            mindMapRef.current?.enableInteraction();
            setImageModalVisible(false);
          }}
          onUpload={handleImageUpload}
        />

        {/* 图片预览弹窗 */}
        <PhotoSlider
          images={imagePreviewState.imageData ? [{ src: imagePreviewState.imageData.base64, key: 'preview' }] : []}
          visible={imagePreviewState.visible}
          onClose={handleCloseImagePreview}
          index={0}
          onIndexChange={() => {}}
          toolbarRender={({ onScale, scale, rotate, onRotate }) => {
            const iconStyle = { cursor: 'pointer', width: 22, height: 22 };
            const dividerStyle = { width: 1, height: 20, background: 'rgba(255,255,255,0.3)' };
            const handleDownload = () => {
              if (!imagePreviewState.imageData?.base64) return;
              const link = document.createElement('a');
              link.href = imagePreviewState.imageData.base64;
              link.download = imagePreviewState.imageData.fileName || 'image.png';
              link.click();
            };
            return (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <ZoomOut onClick={() => onScale(scale - 0.1)} style={{ ...iconStyle, opacity: scale <= 1 ? 0.3 : 1 }} />
                <span style={{ minWidth: 48, textAlign: 'center', fontSize: 14 }}>{Math.round(scale * 100)}%</span>
                <ZoomIn onClick={() => onScale(scale + 0.1)} style={{ ...iconStyle, opacity: scale >= 6 ? 0.3 : 1 }} />
                <div style={dividerStyle} />
                <Undo onClick={() => onRotate(rotate - 90)} style={iconStyle} />
                <Redo onClick={() => onRotate(rotate + 90)} style={iconStyle} />
                <div style={dividerStyle} />
                <Download onClick={handleDownload} style={iconStyle} />
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}

export default App;
