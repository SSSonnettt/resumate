"use client";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ThemeGallery } from "@/components/themes/theme-gallery";

export function StylePanel() {
  const themeSlug = useResumeStore((s) => s.resume.themeSlug);
  const setThemeSlug = useResumeStore((s) => s.setThemeSlug);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-white/[0.02]">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h3 className="text-sm font-semibold">主题</h3>
        <p className="mt-1 text-xs text-foreground-dim">
          从 55 个社区主题中选择
        </p>
      </div>
      <div className="p-4">
        <ThemeGallery currentSlug={themeSlug} onSelect={setThemeSlug} />
      </div>
    </section>
  );
}
