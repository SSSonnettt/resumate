"use client";
import { useState, useMemo } from "react";
import { THEMES } from "@/lib/themes/registry";
import { MagnifyingGlass, ArrowSquareOut } from "@phosphor-icons/react";

interface Props {
  currentSlug: string;
  onSelect: (slug: string) => void;
}

export function ThemeGallery({ currentSlug, onSelect }: Props) {
  const [search, setSearch] = useState("");

  // 搜索筛选
  const filteredThemes = useMemo(() => {
    if (!search.trim()) return THEMES;
    const q = search.toLowerCase();
    return THEMES.filter(
      (t) =>
        t.nameZh.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [search]);

  const selectedTheme = THEMES.find((t) => t.slug === currentSlug);

  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      <div className="relative">
        <MagnifyingGlass
          size={14}
          weight="light"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-dim"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索主题..."
          className="h-9 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-foreground-dim/40 focus:border-primary/25"
        />
      </div>

      {/* 主题下拉选择 */}
      <select
        value={currentSlug}
        onChange={(e) => onSelect(e.target.value)}
        className="h-9 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 text-sm outline-none transition-colors focus:border-primary/25"
      >
        {filteredThemes.map((theme) => (
          <option key={theme.slug} value={theme.slug}>
            {theme.nameZh} ({theme.slug})
          </option>
        ))}
      </select>

      {/* 预览按钮 */}
      {selectedTheme && (
        <a
          href={`https://registry.jsonresume.org/${selectedTheme.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-foreground-dim transition-colors hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-foreground"
        >
          <ArrowSquareOut size={14} weight="light" />
          预览「{selectedTheme.nameZh}」
        </a>
      )}

      {/* 无结果提示 */}
      {filteredThemes.length === 0 && (
        <p className="py-4 text-center text-xs text-foreground-dim">
          未找到匹配的主题
        </p>
      )}
    </div>
  );
}
