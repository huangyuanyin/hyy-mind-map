import { useEffect, useRef, useState, useCallback } from 'react';
import { MindMap, RichTextPlugin, ThemePlugin, BUILT_IN_THEMES } from 'hyy-mind-map';
import type { NodeData, HyyMindMapNode } from 'hyy-mind-map';
import { STORAGE_KEYS, DEFAULT_MIND_MAP_DATA, AUTO_SAVE_DEBOUNCE_MS, DEFAULT_THEME_ID } from '../constants';

// 注册插件
MindMap.usePlugin(RichTextPlugin);
MindMap.usePlugin(ThemePlugin);

/**
 * 节点样式类型
 */
export interface NodeStyle {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

/**
 * useMindMap hook 返回值
 */
export interface UseMindMapReturn {
  /** MindMap 实例引用 */
  mindMapRef: React.MutableRefObject<MindMap | null>;
  /** 容器引用 */
  containerRef: React.RefObject<HTMLDivElement>;
  /** 当前缩放比例 */
  scale: number;
  /** 是否有选中的节点 */
  hasSelectedNode: boolean;
  /** 当前激活的节点 ID */
  activeNodeId: string | null;
  /** 当前节点是否是根节点 */
  isRootNode: boolean;
  /** 当前节点样式 */
  nodeStyle: NodeStyle;
  /** 当前主题 ID */
  currentThemeId: string;
  /** 切换主题 */
  handleThemeChange: (themeId: string) => void;
  /** 放大 */
  handleZoomIn: () => void;
  /** 缩小 */
  handleZoomOut: () => void;
}

/**
 * 从 localStorage 加载数据
 */
function loadData(): NodeData {
  try {
    const savedData = localStorage.getItem(STORAGE_KEYS.MIND_MAP_DATA);
    if (savedData) {
      return JSON.parse(savedData);
    }
  } catch (error) {
    console.error('Failed to load data from localStorage:', error);
  }
  return DEFAULT_MIND_MAP_DATA;
}

/**
 * 管理 MindMap 实例和基本状态
 */
export function useMindMap(): UseMindMapReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindMapRef = useRef<MindMap | null>(null);

  const [scale, setScale] = useState<number>(1);
  const [hasSelectedNode, setHasSelectedNode] = useState<boolean>(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isRootNode, setIsRootNode] = useState<boolean>(false);
  const [nodeStyle, setNodeStyle] = useState<NodeStyle>({});
  const [currentThemeId, setCurrentThemeId] = useState<string>(DEFAULT_THEME_ID);

  useEffect(() => {
    if (!containerRef.current) return;

    const data = loadData();

    // 创建思维导图实例
    const mindMap = new MindMap({
      container: containerRef.current,
      data,
      enableShortcuts: true,
    });

    mindMapRef.current = mindMap;

    // 恢复视图状态
    try {
      const savedViewState = localStorage.getItem(STORAGE_KEYS.VIEW_STATE);
      if (savedViewState) {
        const viewState = JSON.parse(savedViewState);
        if (viewState.scale) {
          mindMap.viewService.setScale(viewState.scale);
        }
        if (viewState.translateX !== undefined && viewState.translateY !== undefined) {
          mindMap.getStateManager().setViewState({
            scale: viewState.scale || 1,
            translateX: viewState.translateX || 0,
            translateY: viewState.translateY || 0,
          });
          mindMap.render();
        }
      }
    } catch (error) {
      console.error('Failed to restore view state:', error);
    }

    // 监听状态变化
    const stateManager = mindMap.getStateManager();

    // 视图变化监听
    const unsubscribeView = stateManager.on('view:change', (state) => {
      setScale(state.view.scale);
    });

    // 更新工具栏状态的函数
    const updateToolbarState = () => {
      const state = stateManager.getState();
      const selectedNode = state.selection.activeNode;

      if (selectedNode) {
        setHasSelectedNode(true);
        setActiveNodeId(selectedNode.id);
        setIsRootNode(selectedNode.parent === null || selectedNode.parent === undefined);

        // 获取节点样式
        const nodeConfig = selectedNode.config;
        if (nodeConfig) {
          setNodeStyle({
            backgroundColor: nodeConfig.backgroundColor,
            textColor: nodeConfig.textColor,
            fontSize: nodeConfig.fontSize,
            bold: nodeConfig.bold,
            italic: nodeConfig.italic,
            underline: nodeConfig.underline,
            strikethrough: nodeConfig.strikethrough,
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

    const unsubscribeSelection = stateManager.on('selection:change', updateToolbarState);

    // 初始化时更新工具栏状态
    updateToolbarState();

    // 自动保存函数
    const saveData = () => {
      try {
        const currentData = mindMap.getData();
        localStorage.setItem(STORAGE_KEYS.MIND_MAP_DATA, JSON.stringify(currentData));

        const state = stateManager.getState();
        const viewState = {
          scale: state.view.scale,
          translateX: state.view.translateX,
          translateY: state.view.translateY,
        };
        localStorage.setItem(STORAGE_KEYS.VIEW_STATE, JSON.stringify(viewState));

        console.log('Data and view state saved to localStorage');
      } catch (error) {
        console.error('Failed to save data to localStorage:', error);
      }
    };

    // 防抖保存
    let saveTimeout: NodeJS.Timeout;
    const debouncedSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveData, AUTO_SAVE_DEBOUNCE_MS);
    };

    const unsubscribeViewSave = stateManager.on('view:change', debouncedSave);
    const unsubscribeSelectionSave = stateManager.on('selection:change', debouncedSave);

    // 初始化主题
    const initTheme = async () => {
      await mindMap.ready();
      const themePlugin = mindMap.getPlugin<ThemePlugin>('theme');
      if (themePlugin) {
        // 注册所有内置主题
        BUILT_IN_THEMES.forEach(preset => {
          themePlugin.registerTheme(preset.id, preset.theme);
          console.log(`Registered theme: ${preset.id}`);
        });

        // 加载保存的主题
        const savedThemeId = localStorage.getItem(STORAGE_KEYS.THEME);
        if (savedThemeId && BUILT_IN_THEMES.some(t => t.id === savedThemeId)) {
          console.log(`Loading saved theme: ${savedThemeId}`);
          setCurrentThemeId(savedThemeId);
          themePlugin.switchTheme(savedThemeId);
          const theme = BUILT_IN_THEMES.find(t => t.id === savedThemeId)?.theme;
          if (theme && containerRef.current) {
            containerRef.current.style.background = theme.backgroundColor;
          }
        }
      }
    };
    initTheme();

    return () => {
      clearTimeout(saveTimeout);
      unsubscribeView();
      unsubscribeSelection();
      unsubscribeViewSave();
      unsubscribeSelectionSave();
      mindMap.destroy();
    };
  }, []);

  // 主题切换
  const handleThemeChange = useCallback((themeId: string) => {
    if (!mindMapRef.current) return;

    const themePlugin = mindMapRef.current.getPlugin<ThemePlugin>('theme');
    if (!themePlugin) return;

    // 清除所有节点的自定义颜色
    const root = mindMapRef.current.getRoot();
    if (!root) return;

    const clearCustomColors = (node: HyyMindMapNode) => {
      if (node.config) {
        node.config.backgroundColor = undefined;
        node.config.textColor = undefined;
        node.config.borderColor = undefined;
      }
      node.children.forEach(clearCustomColors);
    };
    clearCustomColors(root);

    // 切换主题
    const success = themePlugin.switchTheme(themeId);
    if (!success) return;

    // 更新画布背景
    const theme = BUILT_IN_THEMES.find(t => t.id === themeId)?.theme;
    if (theme && containerRef.current) {
      containerRef.current.style.background = theme.backgroundColor;
    }

    // 保存并更新状态
    localStorage.setItem(STORAGE_KEYS.THEME, themeId);
    setCurrentThemeId(themeId);

    // 重新布局
    mindMapRef.current.relayout();
  }, []);

  // 放大
  const handleZoomIn = useCallback(() => {
    mindMapRef.current?.viewService.zoomIn();
  }, []);

  // 缩小
  const handleZoomOut = useCallback(() => {
    mindMapRef.current?.viewService.zoomOut();
  }, []);

  return {
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
  };
}
