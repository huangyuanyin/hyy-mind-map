import { useState, useEffect } from 'react';
import { icons } from '../assets/icons';
import './IconSelector.css';

// 图标分类
const iconCategories = [
  { key: 'priority', label: '优先级', count: 9 },
  { key: 'progress', label: '进度', count: 8 },
  { key: 'flag', label: '旗帜', count: 9 },
  { key: 'star', label: '星星', count: 9 },
  { key: 'avatar', label: '头像', count: 9 },
  { key: 'arrow', label: '箭头', count: 9 },
];

interface IconSelectorProps {
  onSelect: (icons: Record<string, string>) => void;
  onClose: () => void;
  initialIcons?: Record<string, string>; // 初始选中的图标，格式：{ priority: 'iconUrl', progress: 'iconUrl' }
}

export const IconSelector: React.FC<IconSelectorProps> = ({ onSelect, onClose, initialIcons = {} }) => {
  const [activeMainTab, setActiveMainTab] = useState<'style' | 'theme' | 'layout' | 'icon'>('icon');
  const [activeSubTab, setActiveSubTab] = useState<'icon' | 'sticker' | 'image'>('icon');
  // 跟踪每个分类选中的图标，格式：{ priority: 'priority_1', progress: 'progress_3' }
  const [selectedIcons, setSelectedIcons] = useState<Record<string, string>>(() => {
    // 将 initialIcons 中的 URL 转换为图标名称
    const iconNameMap: Record<string, string> = {};
    Object.entries(initialIcons).forEach(([category, url]) => {
      // 反向查找图标名称
      const iconName = Object.entries(icons).find(([_, iconUrl]) => iconUrl === url)?.[0];
      if (iconName) {
        iconNameMap[category] = iconName;
      }
    });
    return iconNameMap;
  });

  // 监听 initialIcons 变化，当切换节点时更新选中状态
  useEffect(() => {
    const iconNameMap: Record<string, string> = {};
    Object.entries(initialIcons).forEach(([category, url]) => {
      // 反向查找图标名称
      const iconName = Object.entries(icons).find(([_, iconUrl]) => iconUrl === url)?.[0];
      if (iconName) {
        iconNameMap[category] = iconName;
      }
    });
    setSelectedIcons(iconNameMap);
  }, [initialIcons]);

  // 监听 ESC 键关闭面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // 从图标名称中提取分类（例如：'priority_1' -> 'priority'）
  const getCategoryFromIconName = (iconName: string): string => {
    return iconName.split('_')[0];
  };

  const handleIconClick = (iconName: string) => {
    const iconUrl = icons[iconName];
    if (!iconUrl) return;

    const category = getCategoryFromIconName(iconName);

    // 计算新的选中状态（使用更明确的方式创建新对象）
    let newSelected: Record<string, string>;

    // 如果点击的是已选中的图标，则取消选中
    if (selectedIcons[category] === iconName) {
      // 创建新对象，不包含该分类
      newSelected = {};
      Object.entries(selectedIcons).forEach(([cat, name]) => {
        if (cat !== category) {
          newSelected[cat] = name;
        }
      });
    } else {
      // 否则选中该图标（会替换同分类的其他图标）
      newSelected = {
        ...selectedIcons,
        [category]: iconName,
      };
    }

    // 将选中的图标名称转换为 URL 并通知父组件
    const selectedIconUrls: Record<string, string> = {};
    Object.entries(newSelected).forEach(([cat, name]) => {
      if (icons[name]) {
        selectedIconUrls[cat] = icons[name];
      }
    });

    // 先更新状态
    setSelectedIcons(newSelected);

    // 然后立即通知父组件
    onSelect(selectedIconUrls);
  };

  // 检查图标是否被选中
  const isIconSelected = (iconName: string): boolean => {
    const category = getCategoryFromIconName(iconName);
    return selectedIcons[category] === iconName;
  };

  return (
    <div className="icon-selector">
      {/* 主导航 Tab */}
      <div className="main-tabs">
        <button
          className={`main-tab ${activeMainTab === 'style' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('style')}
        >
          样式
        </button>
        <button
          className={`main-tab ${activeMainTab === 'theme' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('theme')}
        >
          主题
        </button>
        <button
          className={`main-tab ${activeMainTab === 'layout' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('layout')}
        >
          布局
        </button>
        <button
          className={`main-tab ${activeMainTab === 'icon' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('icon')}
        >
          图标
        </button>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* 图标 Tab 的内容 */}
      {activeMainTab === 'icon' && (
        <>
          {/* 二级 Tab */}
          <div className="sub-tabs">
            <button
              className={`sub-tab ${activeSubTab === 'icon' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('icon')}
            >
              图标
            </button>
            <button
              className={`sub-tab ${activeSubTab === 'sticker' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('sticker')}
            >
              贴纸
            </button>
            <button
              className={`sub-tab ${activeSubTab === 'image' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('image')}
            >
              插画
            </button>
          </div>

        {/* 图标内容区域 - 垂直滚动 */}
        <div className="icon-content-wrapper">
          {iconCategories.map((category) => {
            const categoryIcons = [];
            for (let i = 1; i <= category.count; i++) {
              const iconName = `${category.key}_${i}`;
              if (icons[iconName]) {
                categoryIcons.push(iconName);
              }
            }

            return (
              <div key={category.key} className="icon-category-section">
                {/* 分类标题 */}
                <div className="category-title">{category.label}</div>

                {/* 图标网格 */}
                <div className="icon-grid-inline">
                  {categoryIcons.map((icon) => {
                    const selected = isIconSelected(icon);
                    return (
                      <button
                        key={icon}
                        className={`icon-item ${selected ? 'selected' : ''}`}
                        onClick={() => handleIconClick(icon)}
                        title={`${icon} ${selected ? '[已选中]' : ''}`}
                      >
                        <img
                          src={icons[icon]}
                          alt={icon}
                          className="icon-image"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* 其他 Tab 的占位内容 */}
      {activeMainTab !== 'icon' && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '14px'
        }}>
          {activeMainTab === 'style' && '样式功能开发中...'}
          {activeMainTab === 'theme' && '主题功能开发中...'}
          {activeMainTab === 'layout' && '布局功能开发中...'}
        </div>
      )}
    </div>
  );
};
