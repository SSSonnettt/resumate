"use client";
import { memo } from "react";
import type { ThemeMeta } from "@/lib/themes/registry";
import { Check } from "@phosphor-icons/react";

interface Props {
  theme: ThemeMeta;
  isSelected: boolean;
  onSelect: (slug: string) => void;
}

export const ThemeCard = memo(function ThemeCard({
  theme,
  isSelected,
  onSelect,
}: Props) {
  return (
    <button
      onClick={() => onSelect(theme.slug)}
      className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-200 ${
        isSelected
          ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
      }`}
    >
      {/* 预览图 */}
      <div className="aspect-[3/4] w-full overflow-hidden bg-slate-100">
        <img
          src={theme.previewUrl}
          alt={theme.nameZh}
          loading="lazy"
          className="h-full w-full object-cover object-top"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* 选中标记 */}
      {isSelected && (
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
          <Check size={12} weight="bold" />
        </div>
      )}

      {/* 名称与标签 */}
      <div className="p-2">
        <p className="truncate text-xs font-medium text-foreground">
          {theme.nameZh}
        </p>
        {theme.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {theme.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-foreground-dim"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
});
