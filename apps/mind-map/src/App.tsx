import { useEffect, useRef, useState } from 'react';
import { HyyMindMap } from 'simple-mind-map';
import type { NodeData } from 'simple-mind-map';
import { Menu } from '@arco-design/web-react';
import '@arco-design/web-react/dist/css/arco.css';
import { IconSelector } from './components/IconSelector';
import { NodeFormatToolbar } from './components/NodeFormatToolbar';
import './App.css';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindMapRef = useRef<HyyMindMap | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [contextMenuVisible, setContextMenuVisible] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [contextMenuType, setContextMenuType] = useState<'canvas' | 'node'>('canvas');
  const [canPaste, setCanPaste] = useState<boolean>(false);
  const [isRootNode, setIsRootNode] = useState<boolean>(false);
  // 节点工具栏状态
  const [hasSelectedNode, setHasSelectedNode] = useState<boolean>(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  // 图标选择器状态
  const [iconSelectorVisible, setIconSelectorVisible] = useState<boolean>(false);
  // 节点格式化工具栏状态
  const [nodeStyle, setNodeStyle] = useState<{
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
  }>({});

  useEffect(() => {
    if (!containerRef.current) return;

    // 从 localStorage 加载数据，如果不存在则使用默认数据
    const STORAGE_KEY = 'mind-map-data';
    const VIEW_STATE_KEY = 'mind-map-view-state';

    const loadData = (): NodeData => {
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          return JSON.parse(savedData);
        }
      } catch (error) {
        console.error('Failed to load data from localStorage:', error);
      }

      // 默认数据 - 添加多层级节点用于测试展开/收起功能
      return {
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
    };

    const data = loadData();

    // 创建思维导图实例（启用 DOM 节点渲染以支持双击编辑）
    const mindMap = new HyyMindMap({
      container: containerRef.current,
      data,
      useDOMNodes: true,
    });

    mindMapRef.current = mindMap;

    // 恢复视图状态（缩放和平移）
    try {
      const savedViewState = localStorage.getItem(VIEW_STATE_KEY);
      if (savedViewState) {
        const viewState = JSON.parse(savedViewState);
        if (viewState.scale) {
          mindMap.setScale(viewState.scale);
        }
        if (viewState.translateX !== undefined && viewState.translateY !== undefined) {
          // 需要添加 setTranslate 方法到 HyyMindMap
          (mindMap as any).viewState = {
            scale: viewState.scale || 1,
            translateX: viewState.translateX || 0,
            translateY: viewState.translateY || 0,
          };
          mindMap.render();
        }
      }
    } catch (error) {
      console.error('Failed to restore view state:', error);
    }

    // 监听缩放变化
    const unsubscribe = mindMap.onScaleChange((newScale) => {
      setScale(newScale);
    });

    // 监听节点选中状态，更新工具栏状态
    const updateToolbarState = () => {
      const selectedNode = mindMap.getSelectedNode();
      if (selectedNode) {
        setHasSelectedNode(true);
        setActiveNodeId(selectedNode.id);
        setIsRootNode(selectedNode.parent === null || selectedNode.parent === undefined);
        // 获取节点样式
        const style = mindMap.getNodeStyle(selectedNode.id);
        if (style) {
          setNodeStyle({
            backgroundColor: style.backgroundColor,
            textColor: style.textColor,
            fontSize: style.fontSize,
            bold: style.bold,
            italic: style.italic,
            underline: style.underline,
            strikethrough: style.strikethrough,
          });
        } else {
          setNodeStyle({});
        }
      } else {
        setHasSelectedNode(false);
        setActiveNodeId(null);
        setIsRootNode(false);
        setNodeStyle({});
      }
    };

    (mindMap as any).eventSystem.on('node_click', updateToolbarState);
    (mindMap as any).eventSystem.on('canvas_click', updateToolbarState);
    (mindMap as any).eventSystem.on('selection_changed', updateToolbarState);

    // 初始化时更新工具栏状态
    updateToolbarState();

    // 自动保存到 localStorage
    const saveData = () => {
      try {
        // 保存节点数据
        const currentData = mindMap.getData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));

        // 保存视图状态
        const viewState = {
          scale: mindMap.getScale(),
          translateX: (mindMap as any).viewState.translateX,
          translateY: (mindMap as any).viewState.translateY,
        };
        localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(viewState));

        console.log('Data and view state saved to localStorage');
      } catch (error) {
        console.error('Failed to save data to localStorage:', error);
      }
    };

    // 监听数据变化并保存（使用防抖以避免过于频繁的保存）
    let saveTimeout: NodeJS.Timeout;
    const debouncedSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveData, 500); // 500ms 防抖
    };

    (mindMap as any).eventSystem.on('render_needed', debouncedSave);

    // 清理函数
    return () => {
      clearTimeout(saveTimeout);
      unsubscribe();
      mindMap.destroy();
    };
  }, []);

  // 放大
  const handleZoomIn = () => {
    if (mindMapRef.current) {
      const currentScale = mindMapRef.current.getScale();
      mindMapRef.current.setScale(currentScale + 0.1);
    }
  };

  // 缩小
  const handleZoomOut = () => {
    if (mindMapRef.current) {
      const currentScale = mindMapRef.current.getScale();
      mindMapRef.current.setScale(currentScale - 0.1);
    }
  };

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    // 判断是否点击在节点上
    if (mindMapRef.current) {
      const selectedNode = mindMapRef.current.getSelectedNode();
      const hasSelectedNodes = mindMapRef.current.getAllSelectedNodes().length > 0;

      if (selectedNode || hasSelectedNodes) {
        setContextMenuType('node');
        setIsRootNode(selectedNode?.parent === null || selectedNode?.parent === undefined);

        // 检查剪贴板是否有内容
        const shortcutManager = mindMapRef.current.getShortcutManager();
        const clipboard = shortcutManager.getClipboard();
        setCanPaste(clipboard && (clipboard.type === 'node' || clipboard.type === 'nodes'));
      } else {
        setContextMenuType('canvas');
      }
    }

    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);
  };

  // 回到根节点
  const handleCenterOnRoot = () => {
    if (mindMapRef.current) {
      mindMapRef.current.centerOnRoot();
    }
    setContextMenuVisible(false);
  };

  // 展开所有节点
  const handleExpandAll = () => {
    if (mindMapRef.current) {
      mindMapRef.current.expandAll();
    }
    setContextMenuVisible(false);
  };

  // 折叠所有节点
  const handleCollapseAll = () => {
    if (mindMapRef.current) {
      mindMapRef.current.collapseAll();
    }
    setContextMenuVisible(false);
  };

  // 删除选中的节点
  const handleDeleteSelected = () => {
    if (mindMapRef.current) {
      const count = mindMapRef.current.removeSelectedNodes();
      console.log(`已删除 ${count} 个节点`);
    }
  };

  // 复制选中的节点
  const handleCopySelected = () => {
    if (mindMapRef.current) {
      const copiedData = mindMapRef.current.copySelectedNodes();
      console.log('已复制节点数据:', copiedData);
      alert(`已复制 ${copiedData.length} 个节点到剪贴板`);
    }
  };

  // 插入子节点
  const handleInsertChild = () => {
    if (mindMapRef.current) {
      const selectedNode = mindMapRef.current.getSelectedNode();
      if (selectedNode) {
        mindMapRef.current.addNode(selectedNode.id, '新子节点');
      }
    }
    setContextMenuVisible(false);
  };

  // 插入同级节点
  const handleInsertSibling = () => {
    if (isRootNode) return;
    if (mindMapRef.current) {
      const selectedNode = mindMapRef.current.getSelectedNode();
      if (selectedNode && selectedNode.parent) {
        (mindMapRef.current as any).insertSiblingNode(selectedNode.id, '新同级节点');
      }
    }
    setContextMenuVisible(false);
  };

  // 插入父节点
  const handleInsertParent = () => {
    if (isRootNode) return;
    if (mindMapRef.current) {
      const selectedNode = mindMapRef.current.getSelectedNode();
      if (selectedNode && selectedNode.parent) {
        (mindMapRef.current as any).insertParentNode(selectedNode.id, '新父节点');
      }
    }
    setContextMenuVisible(false);
  };

  // 删除节点（右键菜单）
  const handleDeleteNode = () => {
    if (isRootNode) return;
    if (mindMapRef.current) {
      const count = mindMapRef.current.removeSelectedNodes();
      console.log(`已删除 ${count} 个节点`);
    }
    setContextMenuVisible(false);
  };

  // 复制节点（右键菜单）
  const handleCopyNode = () => {
    if (mindMapRef.current) {
      // 使用快捷键管理器的剪贴板
      const shortcutManager = mindMapRef.current.getShortcutManager();
      const copiedData = mindMapRef.current.copySelectedNodes();

      shortcutManager.setClipboard({
        type: 'nodes',
        data: copiedData,
      });

      console.log(`已复制 ${copiedData.length} 个节点到剪贴板`);
    }
    setContextMenuVisible(false);
  };

  // 粘贴节点（右键菜单）
  const handlePasteNode = () => {
    if (!canPaste) return;
    if (mindMapRef.current) {
      const selectedNode = mindMapRef.current.getSelectedNode();
      if (!selectedNode) return;

      const shortcutManager = mindMapRef.current.getShortcutManager();
      const clipboard = shortcutManager.getClipboard();

      if (!clipboard || (clipboard.type !== 'node' && clipboard.type !== 'nodes')) {
        alert('剪贴板中没有节点数据');
        setContextMenuVisible(false);
        return;
      }

      // 兼容旧格式（单个节点）和新格式（节点数组）
      const nodesToPaste = clipboard.type === 'nodes' ? clipboard.data : [clipboard.data];

      // 粘贴所有节点（包含子节点）
      nodesToPaste.forEach((nodeData: any) => {
        mindMapRef.current!.pasteNodeData(selectedNode.id, nodeData);
      });

      console.log(`已粘贴 ${nodesToPaste.length} 个节点`);
    }
    setContextMenuVisible(false);
  };

  // 工具栏 - 删除节点
  const handleToolbarDelete = () => {
    if (!hasSelectedNode || isRootNode) return;
    if (mindMapRef.current) {
      const count = mindMapRef.current.removeSelectedNodes();
      console.log(`已删除 ${count} 个节点`);
    }
  };

  // 工具栏 - 新增子节点
  const handleToolbarAddChild = () => {
    if (!hasSelectedNode) return;
    if (mindMapRef.current && activeNodeId) {
      mindMapRef.current.addNode(activeNodeId, '新子节点');
    }
  };

  // 工具栏 - 新增同级节点
  const handleToolbarAddSibling = () => {
    if (!hasSelectedNode || isRootNode) return;
    if (mindMapRef.current && activeNodeId) {
      (mindMapRef.current as any).insertSiblingNode(activeNodeId, '新同级节点');
    }
  };

  // 工具栏 - 添加图标
  const handleToolbarIcon = () => {
    if (!hasSelectedNode) return;
    setIconSelectorVisible(true);
  };

  // 处理节点样式变更
  const handleNodeStyleChange = (nodeId: string, style: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
  }) => {
    if (!mindMapRef.current) return;
    mindMapRef.current.updateNodeStyle(nodeId, style);
    // 更新本地状态
    setNodeStyle(prev => ({ ...prev, ...style }));
  };

  // 处理插入表格
  const handleInsertTable = (nodeId: string) => {
    if (!mindMapRef.current) return;
    
    // 创建一个默认的 2x3 表格
    const defaultTable = {
      rows: [
        [{ content: '标题1', isHeader: true }, { content: '标题2', isHeader: true }, { content: '标题3', isHeader: true }],
        [{ content: '内容1' }, { content: '内容2' }, { content: '内容3' }],
      ]
    };
    
    mindMapRef.current.setNodeTable(nodeId, defaultTable);
  };

  // 处理插入代码块
  const handleInsertCodeBlock = (nodeId: string) => {
    if (!mindMapRef.current) return;
    
    // 获取节点当前的文本内容
    const selectedNode = mindMapRef.current.getSelectedNode();
    const nodeText = selectedNode?.text || selectedNode?.richContent?.text || '';
    
    // 如果节点无内容，不执行任何操作
    if (!nodeText.trim()) {
      return;
    }
    
    // 使用节点的文本内容作为代码块内容
    mindMapRef.current.setNodeCodeBlock(nodeId, nodeText, 'javascript');
  };

  // 处理图标选择
  const handleIconSelect = (icons: Record<string, string>) => {
    if (!mindMapRef.current || !activeNodeId) return;

    // 更新节点配置
    const selectedNode = mindMapRef.current.getSelectedNode();
    if (selectedNode) {
      selectedNode.config = {
        ...selectedNode.config,
        icons: icons, // 存储多个图标
      };
      // 重新计算布局以更新节点宽度
      mindMapRef.current.relayout();
    }
  };

  // 点击其他地方关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuVisible(false);
    };

    if (contextMenuVisible) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [contextMenuVisible]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 画布区域 */}
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        style={{
          width: '100%',
          height: '100%',
          background: '#fafafa',
          position: 'relative',
        }}
      >
        {/* 节点工具栏 - 固定在顶部 */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'white',
            padding: '10px 16px',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            zIndex: 1001,
          }}
        >
          {/* 删除节点按钮 */}
          <button
            onClick={handleToolbarDelete}
            disabled={!hasSelectedNode || isRootNode}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              background: (!hasSelectedNode || isRootNode) ? '#f5f5f5' : 'white',
              cursor: (!hasSelectedNode || isRootNode) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: (!hasSelectedNode || isRootNode) ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (hasSelectedNode && !isRootNode) {
                e.currentTarget.style.background = '#fff1f0';
                e.currentTarget.style.borderColor = '#ff4d4f';
              }
            }}
            onMouseLeave={(e) => {
              if (hasSelectedNode && !isRootNode) {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#d9d9d9';
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 2v1H3v1h10V3h-3V2H6zm-1 3v8h6V5H5zm2 1h1v6H7V6zm2 0h1v6H9V6z" fill="#ff4d4f"/>
            </svg>
            <span style={{ fontSize: '12px', color: '#262626', whiteSpace: 'nowrap', fontWeight: 500 }}>删除节点</span>
          </button>

          {/* 同级节点按钮 */}
          <button
            onClick={handleToolbarAddSibling}
            disabled={!hasSelectedNode || isRootNode}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              background: (!hasSelectedNode || isRootNode) ? '#f5f5f5' : 'white',
              cursor: (!hasSelectedNode || isRootNode) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: (!hasSelectedNode || isRootNode) ? 0.5 : 1,
              color: '#1890ff',
            }}
            onMouseEnter={(e) => {
              if (hasSelectedNode && !isRootNode) {
                e.currentTarget.style.background = '#e6f7ff';
                e.currentTarget.style.borderColor = '#1890ff';
              }
            }}
            onMouseLeave={(e) => {
              if (hasSelectedNode && !isRootNode) {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#d9d9d9';
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g>
                <path fillRule="evenodd" clipRule="evenodd" d="M5.0592 8.25111H6.99529C7.34441 9.11763 8.18995 9.72889 9.1776 9.72889C10.4773 9.72889 11.531 8.67029 11.531 7.36444C11.531 6.0586 10.4773 5 9.1776 5C8.18995 5 7.34441 5.61126 6.99529 6.47778H5.0592C3.92193 6.47778 3 7.40405 3 8.54667V14.4578C3 15.6004 3.92193 16.5267 5.0592 16.5267H6.79481V17.7933C6.79481 18.901 7.69273 19.7989 8.80036 19.7989H18.9683C20.0759 19.7989 20.9739 18.901 20.9739 17.7933V13.4867C20.9739 12.379 20.0759 11.4811 18.9683 11.4811H8.80036C7.69273 11.4811 6.79481 12.379 6.79481 13.4867V14.7533H5.0592C4.89673 14.7533 4.76503 14.621 4.76503 14.4578V8.54667C4.76503 8.38344 4.89673 8.25111 5.0592 8.25111ZM8.80036 13.2756H18.9683C19.0849 13.2756 19.1794 13.3701 19.1794 13.4867V17.7933C19.1794 17.9099 19.0849 18.0044 18.9683 18.0044H8.80036C8.68377 18.0044 8.58925 17.9099 8.58925 17.7933V13.4867C8.58925 13.3701 8.68377 13.2756 8.80036 13.2756Z" fill="currentColor"/>
              </g>
            </svg>
            <span style={{ fontSize: '12px', color: '#262626', whiteSpace: 'nowrap', fontWeight: 500 }}>同级节点</span>
          </button>

          {/* 子节点按钮 */}
          <button
            onClick={handleToolbarAddChild}
            disabled={!hasSelectedNode}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              background: !hasSelectedNode ? '#f5f5f5' : 'white',
              cursor: !hasSelectedNode ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: !hasSelectedNode ? 0.5 : 1,
              color: '#52c41a',
            }}
            onMouseEnter={(e) => {
              if (hasSelectedNode) {
                e.currentTarget.style.background = '#f6ffed';
                e.currentTarget.style.borderColor = '#52c41a';
              }
            }}
            onMouseLeave={(e) => {
              if (hasSelectedNode) {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#d9d9d9';
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g>
                <path fillRule="evenodd" clipRule="evenodd" d="M7.59009 10.375C7.59009 9.06332 8.66299 8 9.98649 8H20.7703C22.0938 8 23.1667 9.06332 23.1667 10.375V15.125C23.1667 16.4367 22.0938 17.5 20.7703 17.5H9.98649C8.66299 17.5 7.59009 16.4367 7.59009 15.125V10.375ZM9.98649 9.78125H20.7703C21.1011 9.78125 21.3694 10.0471 21.3694 10.375V15.125C21.3694 15.4529 21.1011 15.7188 20.7703 15.7188H9.98649C9.65561 15.7188 9.38739 15.4529 9.38739 15.125V10.375C9.38739 10.0471 9.65561 9.78125 9.98649 9.78125Z" fill="currentColor"/>
                <path d="M5.61861 13.6406C5.26312 14.511 4.40211 15.125 3.3964 15.125C2.0729 15.125 1 14.0617 1 12.75C1 11.4383 2.0729 10.375 3.3964 10.375C4.40209 10.375 5.26309 10.989 5.61859 11.8594L7.59006 11.8594L7.59004 13.6406L5.61861 13.6406Z" fill="currentColor"/>
              </g>
            </svg>
            <span style={{ fontSize: '12px', color: '#262626', whiteSpace: 'nowrap', fontWeight: 500 }}>子节点</span>
          </button>

          {/* 图标按钮 */}
          <button
            onClick={handleToolbarIcon}
            disabled={!hasSelectedNode}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              background: !hasSelectedNode ? '#f5f5f5' : 'white',
              cursor: !hasSelectedNode ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: !hasSelectedNode ? 0.5 : 1,
              color: '#fa8c16',
            }}
            onMouseEnter={(e) => {
              if (hasSelectedNode) {
                e.currentTarget.style.background = '#fff7e6';
                e.currentTarget.style.borderColor = '#fa8c16';
              }
            }}
            onMouseLeave={(e) => {
              if (hasSelectedNode) {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#d9d9d9';
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C10.3431 2 9 3.34315 9 5C9 6.65685 10.3431 8 12 8C13.6569 8 15 6.65685 15 5C15 3.34315 13.6569 2 12 2Z" fill="currentColor"/>
              <path d="M7 14C5.34315 14 4 15.3431 4 17C4 18.6569 5.34315 20 7 20C8.65685 20 10 18.6569 10 17C10 15.3431 8.65685 14 7 14Z" fill="currentColor"/>
              <path d="M14 17C14 15.3431 15.3431 14 17 14C18.6569 14 20 15.3431 20 17C20 18.6569 18.6569 20 17 20C15.3431 20 14 18.6569 14 17Z" fill="currentColor"/>
            </svg>
            <span style={{ fontSize: '12px', color: '#262626', whiteSpace: 'nowrap', fontWeight: 500 }}>图标</span>
          </button>
        </div>

        {/* 缩放控制面板 - 右下角 */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          {/* 缩小按钮 */}
          <button
            onClick={handleZoomOut}
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
              e.currentTarget.style.borderColor = '#999';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#ddd';
            }}
            title="缩小 (10%)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 8H13" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* 百分比显示 */}
          <div
            style={{
              minWidth: '60px',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 600,
              color: '#333',
              userSelect: 'none',
            }}
          >
            {Math.round(scale * 100)}%
          </div>

          {/* 放大按钮 */}
          <button
            onClick={handleZoomIn}
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
              e.currentTarget.style.borderColor = '#999';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#ddd';
            }}
            title="放大 (10%)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3V13M3 8H13" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 右键菜单 */}
        {contextMenuVisible && (
          <div
            style={{
              position: 'fixed',
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          >
            <Menu
              style={{
                background: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                borderRadius: '4px',
                minWidth: '220px',
              }}
            >
              {contextMenuType === 'node' ? (
                // 节点右键菜单
                <>
                  <Menu.Item key="insertChild" onClick={handleInsertChild}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <g>
                            <path fillRule="evenodd" clipRule="evenodd" d="M7.59009 10.375C7.59009 9.06332 8.66299 8 9.98649 8H20.7703C22.0938 8 23.1667 9.06332 23.1667 10.375V15.125C23.1667 16.4367 22.0938 17.5 20.7703 17.5H9.98649C8.66299 17.5 7.59009 16.4367 7.59009 15.125V10.375ZM9.98649 9.78125H20.7703C21.1011 9.78125 21.3694 10.0471 21.3694 10.375V15.125C21.3694 15.4529 21.1011 15.7188 20.7703 15.7188H9.98649C9.65561 15.7188 9.38739 15.4529 9.38739 15.125V10.375C9.38739 10.0471 9.65561 9.78125 9.98649 9.78125Z" fill="currentColor"/>
                            <path d="M5.61861 13.6406C5.26312 14.511 4.40211 15.125 3.3964 15.125C2.0729 15.125 1 14.0617 1 12.75C1 11.4383 2.0729 10.375 3.3964 10.375C4.40209 10.375 5.26309 10.989 5.61859 11.8594L7.59006 11.8594L7.59004 13.6406L5.61861 13.6406Z" fill="currentColor"/>
                          </g>
                        </svg>
                        插入子节点
                      </span>
                      <span style={{ fontSize: '12px', color: '#999', marginLeft: '24px' }}>Tab</span>
                    </span>
                  </Menu.Item>
                  <Menu.Item
                    key="insertSibling"
                    onClick={handleInsertSibling}
                    disabled={isRootNode}
                    style={isRootNode ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <g>
                            <path fillRule="evenodd" clipRule="evenodd" d="M5.0592 8.25111H6.99529C7.34441 9.11763 8.18995 9.72889 9.1776 9.72889C10.4773 9.72889 11.531 8.67029 11.531 7.36444C11.531 6.0586 10.4773 5 9.1776 5C8.18995 5 7.34441 5.61126 6.99529 6.47778H5.0592C3.92193 6.47778 3 7.40405 3 8.54667V14.4578C3 15.6004 3.92193 16.5267 5.0592 16.5267H6.79481V17.7933C6.79481 18.901 7.69273 19.7989 8.80036 19.7989H18.9683C20.0759 19.7989 20.9739 18.901 20.9739 17.7933V13.4867C20.9739 12.379 20.0759 11.4811 18.9683 11.4811H8.80036C7.69273 11.4811 6.79481 12.379 6.79481 13.4867V14.7533H5.0592C4.89673 14.7533 4.76503 14.621 4.76503 14.4578V8.54667C4.76503 8.38344 4.89673 8.25111 5.0592 8.25111ZM8.80036 13.2756H18.9683C19.0849 13.2756 19.1794 13.3701 19.1794 13.4867V17.7933C19.1794 17.9099 19.0849 18.0044 18.9683 18.0044H8.80036C8.68377 18.0044 8.58925 17.9099 8.58925 17.7933V13.4867C8.58925 13.3701 8.68377 13.2756 8.80036 13.2756Z" fill="currentColor"/>
                          </g>
                        </svg>
                        插入同级节点
                      </span>
                      <span style={{ fontSize: '12px', color: '#999', marginLeft: '24px' }}>Enter</span>
                    </span>
                  </Menu.Item>
                  <Menu.Item
                    key="insertParent"
                    onClick={handleInsertParent}
                    disabled={isRootNode}
                    style={isRootNode ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <g>
                            <path fillRule="evenodd" clipRule="evenodd" d="M7.59009 4.375C7.59009 3.06332 8.66299 2 9.98649 2H20.7703C22.0938 2 23.1667 3.06332 23.1667 4.375V9.125C23.1667 10.4367 22.0938 11.5 20.7703 11.5H9.98649C8.66299 11.5 7.59009 10.4367 7.59009 9.125V4.375ZM9.98649 3.78125H20.7703C21.1011 3.78125 21.3694 4.0471 21.3694 4.375V9.125C21.3694 9.4529 21.1011 9.71875 20.7703 9.71875H9.98649C9.65561 9.71875 9.38739 9.4529 9.38739 9.125V4.375C9.38739 4.0471 9.65561 3.78125 9.98649 3.78125Z" fill="currentColor"/>
                            <circle cx="15.3784" cy="19" r="2.5" fill="currentColor"/>
                            <path d="M15.3784 11.5V16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          </g>
                        </svg>
                        插入父节点
                      </span>
                    </span>
                  </Menu.Item>
                  <Menu.Item key="divider1" style={{ height: '1px', background: '#f0f0f0', margin: '4px 0', padding: 0 }} />
                  <Menu.Item key="copy" onClick={handleCopyNode}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M10 2H4a1 1 0 00-1 1v9h1V3h6V2zm2 2H6a1 1 0 00-1 1v9a1 1 0 001 1h6a1 1 0 001-1V5a1 1 0 00-1-1zm0 10H6V5h6v9z"/>
                        </svg>
                        复制
                      </span>
                      <span style={{ fontSize: '12px', color: '#999', marginLeft: '24px' }}>⌘C</span>
                    </span>
                  </Menu.Item>
                  <Menu.Item
                    key="paste"
                    onClick={handlePasteNode}
                    disabled={!canPaste}
                    style={!canPaste ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M10 2H6v1h4V2zm2 1v1h1v10H3V4h1V3H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V4a1 1 0 00-1-1h-1zM6 3a1 1 0 011-1h2a1 1 0 011 1v1H6V3z"/>
                        </svg>
                        粘贴
                      </span>
                      <span style={{ fontSize: '12px', color: '#999', marginLeft: '24px' }}>⌘V</span>
                    </span>
                  </Menu.Item>
                  <Menu.Item key="divider2" style={{ height: '1px', background: '#f0f0f0', margin: '4px 0', padding: 0 }} />
                  <Menu.Item
                    key="delete"
                    onClick={handleDeleteNode}
                    disabled={isRootNode}
                    style={isRootNode ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isRootNode ? '#999' : '#ff4d4f' }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M6 2v1H3v1h10V3h-3V2H6zm-1 3v8h6V5H5zm2 1h1v6H7V6zm2 0h1v6H9V6z"/>
                        </svg>
                        删除
                      </span>
                      <span style={{ fontSize: '12px', color: '#999', marginLeft: '24px' }}>Delete</span>
                    </span>
                  </Menu.Item>
                </>
              ) : (
                // 画布右键菜单
                <>
                  <Menu.Item key="centerOnRoot" onClick={handleCenterOnRoot}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 1a5 5 0 110 10A5 5 0 018 3zm0 2a3 3 0 100 6 3 3 0 000-6zm0 1a2 2 0 110 4 2 2 0 010-4z"/>
                        </svg>
                        回到根节点
                      </span>
                    </span>
                  </Menu.Item>
                  <Menu.Item key="divider1" style={{ height: '1px', background: '#f0f0f0', margin: '4px 0', padding: 0 }} />
                  <Menu.Item key="expandAll" onClick={handleExpandAll}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <g>
                            <rect x="9" y="2" width="6" height="4" rx="1" fill="currentColor"/>
                            <path d="M12 6V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <circle cx="12" cy="9" r="1.5" fill="currentColor"/>
                            <path d="M12 9L7 12M12 9L17 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <rect x="4" y="12" width="6" height="4" rx="1" fill="currentColor"/>
                            <rect x="14" y="12" width="6" height="4" rx="1" fill="currentColor"/>
                            <path d="M7 16V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <circle cx="7" cy="18" r="1.5" fill="currentColor"/>
                            <path d="M7 18L5 20M7 18L9 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <circle cx="5" cy="20" r="1" fill="currentColor"/>
                            <circle cx="9" cy="20" r="1" fill="currentColor"/>
                            <path d="M17 16V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <circle cx="17" cy="18" r="1.5" fill="currentColor"/>
                            <path d="M17 18L15 20M17 18L19 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <circle cx="15" cy="20" r="1" fill="currentColor"/>
                            <circle cx="19" cy="20" r="1" fill="currentColor"/>
                          </g>
                        </svg>
                        展开所有
                      </span>
                      <span style={{ fontSize: '12px', color: '#999', marginLeft: '24px' }}>⌘⌥/</span>
                    </span>
                  </Menu.Item>
                  <Menu.Item key="collapseAll" onClick={handleCollapseAll}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <g>
                            <rect x="9" y="2" width="6" height="4" rx="1" fill="currentColor"/>
                            <path d="M12 6V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <circle cx="12" cy="9" r="1.5" fill="currentColor"/>
                            <path d="M12 9L7 12M12 9L17 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <rect x="4" y="12" width="6" height="4" rx="1" fill="currentColor"/>
                            <path d="M7 13.5V14.5M6.5 14H7.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
                            <rect x="14" y="12" width="6" height="4" rx="1" fill="currentColor"/>
                            <path d="M17 13.5V14.5M16.5 14H17.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
                            <path d="M7 17L7 19M6 18L7 19L8 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M17 17L17 19M16 18L17 19L18 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </g>
                        </svg>
                        折叠所有
                      </span>
                      <span style={{ fontSize: '12px', color: '#999', marginLeft: '24px' }}>⌘⌥/</span>
                    </span>
                  </Menu.Item>
                </>
              )}
            </Menu>
          </div>
        )}

      {/* 节点格式化工具栏 */}
      <NodeFormatToolbar
        visible={hasSelectedNode}
        nodeId={activeNodeId}
        currentStyle={nodeStyle}
        onStyleChange={handleNodeStyleChange}
        onInsertTable={handleInsertTable}
        onInsertCodeBlock={handleInsertCodeBlock}
        onClose={() => {}}
      />

      {/* 图标选择器 */}
      {iconSelectorVisible && (
        <IconSelector
          onSelect={handleIconSelect}
          onClose={() => setIconSelectorVisible(false)}
          initialIcons={mindMapRef.current?.getSelectedNode()?.config?.icons || {}}
        />
      )}

      </div>
    </div>
  );
}

export default App;
