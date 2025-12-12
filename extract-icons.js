const fs = require('fs');
const path = require('path');

// 读取 HTML 文件
const htmlContent = fs.readFileSync(
  path.join(__dirname, 'apps/mind-map/src/assets/index.html'),
  'utf-8'
);

// 创建输出目录
const outputDir = path.join(__dirname, 'apps/mind-map/src/assets/icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let iconCount = 0;

// 提取内联 SVG 图标
const svgRegex = /<svg[^>]*>[\s\S]*?<\/svg>/g;
const titleRegex = /title="([^"]*)"/;
const svgMatches = htmlContent.match(svgRegex) || [];

// 提取带有 title 属性的 SVG
const divItemRegex = /<div[^>]*?title="([^"]*)"[^>]*?class="mi-item"[^>]*?>([\s\S]*?)<\/div>/g;
let match;

const categories = {
  priority: [], // 优先级
  progress: [], // 进度
  flag: [], // 旗帜
  star: [], // 星星
  avatar: [], // 头像
  arrow: [] // 箭头
};

let currentCategory = null;

// 解析分类和图标
const blockRegex = /<div[^>]*?class="mi-block"[^>]*?>([\s\S]*?)<\/div>\s*<\/div>/g;
let blockMatch;
let blockIndex = 0;

while ((blockMatch = blockRegex.exec(htmlContent)) !== null) {
  const blockContent = blockMatch[1];

  // 获取分类标题
  const titleMatch = blockContent.match(/<span[^>]*?class="mi-block-title"[^>]*?>([^<]*)<\/span>/);
  const categoryTitle = titleMatch ? titleMatch[1] : '';

  // 根据分类标题确定类别
  let categoryKey;
  if (categoryTitle.includes('优先级')) {
    categoryKey = 'priority';
  } else if (categoryTitle.includes('进度')) {
    categoryKey = 'progress';
  } else if (categoryTitle.includes('旗帜')) {
    categoryKey = 'flag';
  } else if (categoryTitle.includes('星星')) {
    categoryKey = 'star';
  } else if (categoryTitle.includes('头像')) {
    categoryKey = 'avatar';
  } else if (categoryTitle.includes('箭头')) {
    categoryKey = 'arrow';
  }

  // 提取该分类下的所有图标
  const itemRegex = /<div[^>]*?class="mi-item"[^>]*?>([\s\S]*?)<\/div>/g;
  let itemMatch;
  let itemIndex = 1;

  while ((itemMatch = itemRegex.exec(blockContent)) !== null) {
    const itemContent = itemMatch[1];

    // 提取 title 属性作为文件名
    const itemTitleMatch = itemMatch[0].match(/title="([^"]*)"/);
    const itemTitle = itemTitleMatch ? itemTitleMatch[1] : '';

    // 检查是内联 SVG 还是 base64 图片
    const svgMatch = itemContent.match(/<svg[\s\S]*?<\/svg>/);
    const imgMatch = itemContent.match(/<img[^>]*?src="data:image\/svg\+xml;base64,([^"]*)"[^>]*?svgname="([^"]*)"[^>]*?>/);

    if (svgMatch) {
      // 内联 SVG
      const svgContent = svgMatch[0];
      const fileName = `${categoryKey}_${itemIndex}.svg`;
      const filePath = path.join(outputDir, fileName);

      fs.writeFileSync(filePath, svgContent, 'utf-8');
      console.log(`Saved: ${fileName} (${itemTitle})`);
      iconCount++;
    } else if (imgMatch) {
      // Base64 编码的 SVG
      const base64Content = imgMatch[1];
      const svgname = imgMatch[2];
      const svgContent = Buffer.from(base64Content, 'base64').toString('utf-8');

      const fileName = svgname ? `${svgname}.svg` : `${categoryKey}_${itemIndex}.svg`;
      const filePath = path.join(outputDir, fileName);

      fs.writeFileSync(filePath, svgContent, 'utf-8');
      console.log(`Saved: ${fileName} (${itemTitle})`);
      iconCount++;
    }

    itemIndex++;
  }
}

console.log(`\n总共提取了 ${iconCount} 个图标到 ${outputDir}`);

// 生成图标索引文件
const indexContent = `// 自动生成的图标索引文件
export const icons = {
  priority: ${JSON.stringify(fs.readdirSync(outputDir).filter(f => f.startsWith('priority_')), null, 2)},
  progress: ${JSON.stringify(fs.readdirSync(outputDir).filter(f => f.startsWith('progress_')), null, 2)},
  flag: ${JSON.stringify(fs.readdirSync(outputDir).filter(f => f.startsWith('flag_')), null, 2)},
  star: ${JSON.stringify(fs.readdirSync(outputDir).filter(f => f.startsWith('star_')), null, 2)},
  avatar: ${JSON.stringify(fs.readdirSync(outputDir).filter(f => f.startsWith('avatar_')), null, 2)},
  arrow: ${JSON.stringify(fs.readdirSync(outputDir).filter(f => f.startsWith('arrow_')), null, 2)},
};
`;

fs.writeFileSync(path.join(outputDir, 'index.ts'), indexContent, 'utf-8');
console.log('图标索引文件已生成: index.ts');
