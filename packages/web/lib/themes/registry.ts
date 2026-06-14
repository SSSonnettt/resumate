/**
 * jsonresume.org 社区主题注册表
 *
 * 数据来源：https://github.com/jsonresume/jsonresume.org/tree/master/packages/themes
 * 预览图：https://registry.jsonresume.org/thumbs/{slug}.jpg
 * CDN 加载：https://esm.sh/jsonresume-theme-{slug}
 */

export interface ThemeMeta {
  /** npm 包名后缀，也是 registry 中的 theme 参数 */
  slug: string;
  /** 中文显示名 */
  nameZh: string;
  /** 分类标签 */
  tags: string[];
  /** registry.jsonresume.org 缩略图 */
  previewUrl: string;
  /** esm.sh 动态加载 CDN URL */
  cdnUrl: string;
}

/** 默认主题 slug */
export const DEFAULT_THEME_SLUG = "flat";

/** 旧模板 ID → 社区主题 slug 降级映射 */
export const MIGRATION_MAP: Record<string, string> = {
  "minimal-professional": "flat",
  "modern-sidebar": "sidebar",
  "elegant-timeline": "elegant",
  "creative-split": "flat",
  "compact-dense": "kendall",
};

/** 主题标签推导规则：从 slug 提取关键词作为标签 */
function deriveTags(slug: string): string[] {
  const tags: string[] = [];
  const lower = slug.toLowerCase();

  // 布局
  if (lower.includes("sidebar")) tags.push("侧边栏");
  if (lower.includes("two-column") || lower.includes("split")) tags.push("双栏");
  if (lower.includes("single") || lower.includes("column")) tags.push("单栏");
  if (lower.includes("grid")) tags.push("网格");
  if (lower.includes("timeline")) tags.push("时间线");

  // 风格
  if (lower.includes("minimal") || lower.includes("flat")) tags.push("极简");
  if (lower.includes("modern") || lower.includes("contemporary")) tags.push("现代");
  if (lower.includes("elegant") || lower.includes("classic") || lower.includes("professional")) tags.push("经典");
  if (lower.includes("creative") || lower.includes("art") || lower.includes("studio")) tags.push("创意");
  if (lower.includes("bold") || lower.includes("brutalist")) tags.push("大胆");
  if (lower.includes("warm") || lower.includes("coastal") || lower.includes("garden")) tags.push("温暖");
  if (lower.includes("noir") || lower.includes("dark")) tags.push("暗色");
  if (lower.includes("pink") || lower.includes("elegant-pink")) tags.push("粉色");

  // 行业/用途
  if (lower.includes("academic") || lower.includes("university")) tags.push("学术");
  if (lower.includes("developer") || lower.includes("stackoverflow") || lower.includes("mono")) tags.push("开发");
  if (lower.includes("engineer") || lower.includes("industrial")) tags.push("工程");
  if (lower.includes("consultant") || lower.includes("executive")) tags.push("咨询");
  if (lower.includes("marketing") || lower.includes("sales")) tags.push("市场");
  if (lower.includes("product-manager")) tags.push("产品");
  if (lower.includes("field-researcher") || lower.includes("data-driven")) tags.push("研究");
  if (lower.includes("clinical") || lower.includes("precision")) tags.push("医疗");
  if (lower.includes("government")) tags.push("政府");
  if (lower.includes("investor") || lower.includes("brief")) tags.push("金融");
  if (lower.includes("writer") || lower.includes("editorial")) tags.push("写作");
  if (lower.includes("architect") || lower.includes("portfolio")) tags.push("作品集");

  // 地域
  if (lower.includes("berlin")) tags.push("柏林");
  if (lower.includes("californian")) tags.push("加州");
  if (lower.includes("london")) tags.push("伦敦");
  if (lower.includes("new-york")) tags.push("纽约");
  if (lower.includes("nordic")) tags.push("北欧");
  if (lower.includes("pacific")) tags.push("太平洋");
  if (lower.includes("french") || lower.includes("atelier")) tags.push("法式");
  if (lower.includes("tokyo")) tags.push("东京");
  if (lower.includes("desert")) tags.push("沙漠");

  // 去重 + 最多 4 个标签
  return [...new Set(tags)].slice(0, 4);
}

export const THEMES: ThemeMeta[] = [
  "academic-cv-lite",
  "architects-portfolio",
  "art-deco",
  "art-school-modern",
  "asymmetric-timeline",
  "berlin-grid",
  "bold-header-statement",
  "brutalist",
  "californian-warm",
  "claude",
  "clinical-precision",
  "coastal-creative",
  "community-garden",
  "consultant-polished",
  "creative-confidence",
  "creative-studio",
  "data-driven",
  "desert-modern",
  "developer-mono",
  "diagonal-accent-bar",
  "elegant",
  "elegant-pink",
  "executive-slate",
  "field-researcher",
  "flat",
  "french-atelier",
  "government-standard",
  "graph-paper-grid",
  "industrial-engineer",
  "investor-brief",
  "kendall",
  "london-bureau",
  "marketing-narrative",
  "mid-century-resume",
  "minimalist-grid",
  "modern-classic",
  "monochrome-noir",
  "new-york-editorial",
  "nordic-minimal",
  "operations-precision",
  "pacific-horizon",
  "product-manager-canvas",
  "professional",
  "reference",
  "sales-hunter",
  "sidebar",
  "sidebar-photo-strip",
  "stackoverflow",
  "tailwind",
  "tokyo-modernist",
  "two-column-modernist",
  "typewriter-modern",
  "university-first",
  "urban-techno",
  "writers-portfolio",
].map((slug) => ({
  slug,
  nameZh: slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" "),
  tags: deriveTags(slug),
  previewUrl: `https://registry.jsonresume.org/thumbs/${slug}.jpg`,
  cdnUrl: `https://esm.sh/jsonresume-theme-${slug}`,
}));

export function getThemeMeta(slug: string): ThemeMeta | undefined {
  return THEMES.find((t) => t.slug === slug);
}
