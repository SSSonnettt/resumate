import { NextRequest, NextResponse } from "next/server";
import { mkdirSync, writeFileSync, existsSync, unlinkSync, readFileSync, symlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execSync } from "child_process";

/**
 * POST /api/themes/render
 * Body: { slug: string, data: Record<string, unknown> }
 *
 * 通过 npm registry CDN 动态加载 jsonresume 主题，在 Node.js 服务端渲染。
 *
 * 加载流程：
 *   1. 从 registry.npmjs.org 获取主题最新版本和 tarball URL
 *   2. 下载 .tgz 到临时目录，解压到 package/ 子目录
 *   3. 通过 Node.js native require 加载 package/index.js
 *   4. 提取 render() 函数，传入用户数据生成 HTML
 *
 * 主题代码依赖 fs.readFileSync(__dirname + "/style.css") 读取模板，
 * 使用完整 tarball 下载确保所有文件（模板、CSS、子目录）都就位。
 *
 * 56 个社区主题立即可用，无需预装。
 */

/**
 * 从 npm registry 异步加载主题模块。
 *
 * 下载完整 tarball → 解压到临时目录（带缓存），再用 Node.js require 加载。
 * 使用 eval('require') 绕过 Next.js bundler 的静态分析。
 */
async function loadThemeModule(slug: string): Promise<unknown> {
  const pkgName = `jsonresume-theme-${slug}`;
  const tmpRoot = join(tmpdir(), "resumate-themes", pkgName);
  const pkgDir = join(tmpRoot, "package");

  // 如果已缓存（package 目录存在且 index.js 或 package.json 存在），直接 require
  if (existsSync(pkgDir)) {
    // 读取 package.json 确定入口文件
    let entryFile = join(pkgDir, "index.js");
    const pkgJsonPath = join(pkgDir, "package.json");
    if (existsSync(pkgJsonPath)) {
      try {
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as { main?: string };
        if (pkgJson.main) {
          entryFile = join(pkgDir, pkgJson.main);
        }
      } catch { /* ignore */ }
    }
    if (existsSync(entryFile)) {
      // 确保 node_modules 软链存在（缓存命中时也要检查）
      const nodeModulesLink = join(pkgDir, "node_modules");
      if (!existsSync(nodeModulesLink)) {
        try {
          symlinkSync(join(process.cwd(), "node_modules"), nodeModulesLink);
        } catch { /* ignore */ }
      }
      // eslint-disable-next-line no-eval
      const nodeRequire = eval("require") as NodeRequire;
      return nodeRequire(entryFile);
    }
    // 入口文件不存在，可能是之前的下载不完整，删除重新下载
  }
  mkdirSync(tmpRoot, { recursive: true });

  // 1. 从 npm registry 获取最新版本号
  const metaUrl = `https://registry.npmjs.org/${pkgName}/latest`;
  const metaRes = await fetch(metaUrl);
  if (!metaRes.ok) {
    throw new Error(`npm registry 返回 ${metaRes.status}`);
  }
  const meta = (await metaRes.json()) as { version: string; dist: { tarball: string } };
  const { version, dist } = meta;

  // 2. 下载 tarball
  const tgzRes = await fetch(dist.tarball);
  if (!tgzRes.ok) {
    throw new Error(`下载 tarball 失败，HTTP ${tgzRes.status}`);
  }
  const tgzData = Buffer.from(await tgzRes.arrayBuffer());
  const tgzPath = join(tmpRoot, `${pkgName}-${version}.tgz`);
  writeFileSync(tgzPath, tgzData);

  // 3. 解压 tarball
  try {
    execSync(`tar -xzf "${tgzPath}" -C "${tmpRoot}"`, { encoding: "utf-8" });
  } finally {
    // 清理 tgz 文件
    try { unlinkSync(tgzPath); } catch { /* ignore */ }
  }

  // 4. 创建 node_modules 软链到项目根目录，解决主题依赖（如 react、handlebars）
  const nodeModulesLink = join(pkgDir, "node_modules");
  if (!existsSync(nodeModulesLink)) {
    try {
      symlinkSync(join(process.cwd(), "node_modules"), nodeModulesLink);
    } catch { /* 竞态条件或权限不足，忽略 */ }
  }

  // 5. 读取 package.json 确定入口文件（部分主题 main 指向 dist/index.js）
  let entryFile = join(pkgDir, "index.js"); // 默认 package/index.js
  try {
    const pkgJsonPath = join(pkgDir, "package.json");
    if (existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(
        readFileSync(pkgJsonPath, "utf-8"),
      ) as { main?: string };
      if (pkgJson.main) {
        entryFile = join(pkgDir, pkgJson.main);
      }
    }
  } catch {
    // 读不到 package.json 就用默认 entry
  }

  // 6. require 加载
  // eslint-disable-next-line no-eval
  const nodeRequire = eval("require") as NodeRequire;
  return nodeRequire(entryFile);
}

export async function POST(req: NextRequest) {
  try {
    const { slug, data } = await req.json();

    if (!slug || !data) {
      return NextResponse.json({ error: "缺少 slug 或 data 参数" }, { status: 400 });
    }

    let themeMod: Awaited<ReturnType<typeof loadThemeModule>>;

    try {
      themeMod = await loadThemeModule(slug);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[themes/render] 加载主题 ${slug} 失败:`, message);
      return NextResponse.json(
        { error: `主题 "${slug}" 加载失败: ${message}` },
        { status: 404 },
      );
    }

    // 提取 render 函数（兼容 module.exports = { render } / exports.render = fn）
    const renderFn: (data: Record<string, unknown>) => string =
      (themeMod as Record<string, unknown>).render as typeof renderFn ??
      (themeMod as Record<string, unknown>).default as typeof renderFn;

    if (typeof renderFn !== "function") {
      return NextResponse.json(
        { error: `主题 "${slug}" 未导出 render 方法` },
        { status: 500 },
      );
    }

    const html = renderFn(data);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[themes/render] ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
