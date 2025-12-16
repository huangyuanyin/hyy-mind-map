import { useState, useCallback } from 'react';
import { Message } from '@arco-design/web-react';
import '@arco-design/web-react/dist/css/arco.css';
import {
  useMindMap,
  useContextMenu,
  useNodeOperations,
  useHyperlinkManager,
  useTableMenuManager,
  useTableOperations,
} from './hooks';
import type { NodeStyle } from './hooks';
import type { TableOperationType } from 'hyy-mind-map';

import { Toolbar } from './components/Toolbar';
import { ZoomControl } from './components/ZoomControl';
import { ContextMenu } from './components/ContextMenu';
import { IconSelector } from './components/IconSelector';
import { NodeFormatToolbar } from './components/NodeFormatToolbar';
import { HyperlinkPopover } from './components/HyperlinkPopover';
import { HyperlinkPreview } from './components/HyperlinkPreview';
import { TableMenu } from './components/TableMenu';
import './App.css';

// 配置 Message 组件位置
Message.config({
  maxCount: 1,
  duration: 2000,
});

function App() {
  const [iconSelectorVisible, setIconSelectorVisible] = useState<boolean>(false);
  // 节点样式状态 - 仅用于 useNodeOperations 同步更新
  const [, setLocalNodeStyle] = useState<NodeStyle>({});

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
      </div>
    </div>
  );
}

export default App;
