import type { ThemePreset } from 'hyy-mind-map';

/**
 * 生成主题预览 SVG
 * 包含：画布背景、1个根节点、2个子节点、连接线
 *
 * @param preset - 主题预设对象
 * @returns SVG 字符串
 */
export function generateThemePreviewSVG(preset: ThemePreset): string {
  const {
    backgroundColor,
    nodeBackgroundColor,
    nodeBorderColor,
    lineColor,
    borderRadius = 8,
  } = preset.theme;

  // 节点圆角半径
  const rootRadius = Math.min(borderRadius, 6);
  const childRadius = Math.min(borderRadius * 0.6, 4);

  // 计算较浅的背景色用于子节点
  const childBgColor = nodeBackgroundColor;

  return `
    <svg width="160" height="100" viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
      <!-- 画布背景 -->
      <rect width="160" height="100" fill="${backgroundColor}" />

      <!-- 连接线组 -->
      <g fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round">
        <!-- 根节点到子节点1 的曲线 -->
        <path d="M 52 44 C 65 44, 70 32, 82 32" />
        <!-- 根节点到子节点2 的曲线 -->
        <path d="M 52 56 C 65 56, 70 68, 82 68" />
      </g>

      <!-- 根节点（较大，居中偏左） -->
      <rect
        x="16"
        y="38"
        width="36"
        height="24"
        rx="${rootRadius}"
        fill="${nodeBackgroundColor}"
        stroke="${nodeBorderColor}"
        stroke-width="2"
      />

      <!-- 子节点1（上方） -->
      <rect
        x="82"
        y="22"
        width="62"
        height="18"
        rx="${childRadius}"
        fill="${childBgColor}"
        stroke="${nodeBorderColor}"
        stroke-width="1.5"
      />

      <!-- 子节点2（下方） -->
      <rect
        x="82"
        y="60"
        width="62"
        height="18"
        rx="${childRadius}"
        fill="${childBgColor}"
        stroke="${nodeBorderColor}"
        stroke-width="1.5"
      />
    </svg>
  `.trim();
}
