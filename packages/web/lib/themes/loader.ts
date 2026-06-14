/**
 * CDN 动态主题加载器
 *
 * 通过 esm.sh 按需加载 jsonresume.org 社区主题包。
 * 模块级 LRU 缓存（最多 5 个），预加载使用 requestIdleCallback。
 */

export interface ThemeModule {
  render: (data: Record<string, unknown>) => string;
  pdfRender?: (data: Record<string, unknown>) => string;
}

/** LRU 缓存：最多缓存 5 个主题模块 */
const cache = new Map<string, { module: ThemeModule; ts: number }>();
const MAX_CACHE_SIZE = 5;

function evictIfNeeded(): void {
  if (cache.size <= MAX_CACHE_SIZE) return;
  // 删除最旧的条目
  let oldestKey = "";
  let oldestTs = Infinity;
  for (const [key, entry] of cache) {
    if (entry.ts < oldestTs) {
      oldestTs = entry.ts;
      oldestKey = key;
    }
  }
  if (oldestKey) cache.delete(oldestKey);
}

/**
 * 从 esm.sh CDN 动态加载主题包。
 * 支持 default export 和 named export（{ render }）。
 *
 * @param slug 主题 slug，对应 npm 包名 jsonresume-theme-{slug}
 * @returns ThemeModule，包含 render 方法
 */
export async function loadTheme(slug: string): Promise<ThemeModule> {
  // 缓存命中
  const cached = cache.get(slug);
  if (cached) {
    // 更新访问时间
    cached.ts = Date.now();
    return cached.module;
  }

  const url = `https://esm.sh/jsonresume-theme-${slug}`;

  try {
    // 使用 new Function 动态 import，绕过 Next.js/Turbopack 的构建时模块解析
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<any>;
    const mod = await dynamicImport(url);

    // 提取 render 函数（支持 default / named export）
    let theme: ThemeModule;

    if (typeof mod.default?.render === "function") {
      theme = mod.default;
    } else if (typeof mod.default === "function") {
      // 部分主题 default export 为直接 render 函数
      theme = { render: mod.default };
    } else if (typeof mod.render === "function") {
      theme = mod;
    } else {
      throw new Error(
        `主题 ${slug} 未导出 render 方法。可用导出: ${Object.keys(mod).join(", ")}`,
      );
    }

    evictIfNeeded();
    cache.set(slug, { module: theme, ts: Date.now() });
    return theme;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`加载主题 ${slug} 失败: ${message}`);
  }
}

/**
 * 低优先级预加载主题包。
 * 在浏览器空闲时异步加载，不阻塞主线程。
 *
 * @param slug 主题 slug
 */
export function preloadTheme(slug: string): void {
  if (cache.has(slug)) return;

  const doPreload = () => {
    loadTheme(slug).catch((err) => {
      console.warn(`预加载主题 ${slug} 失败:`, err instanceof Error ? err.message : err);
    });
  };

  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(doPreload, { timeout: 2000 });
  } else {
    // SSR / 不支持 requestIdleCallback 的环境
    setTimeout(doPreload, 1);
  }
}

/**
 * 预加载多个热门主题（在首屏渲染后调用）。
 */
export function preloadPopularThemes(): void {
  const popular = ["flat", "kendall", "elegant", "sidebar", "stackoverflow"];
  for (const slug of popular) {
    preloadTheme(slug);
  }
}
