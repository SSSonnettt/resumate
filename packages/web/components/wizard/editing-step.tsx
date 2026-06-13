"use client";
import { useState, useMemo } from "react";
import { ResumeCanvas } from "@/components/editor/resume-canvas";
import { StylePanel } from "@/components/editor/style-panel";
import { SectionDataEditor } from "@/components/editor/module-data-editor";
import { useResumeStore } from "@/lib/stores/resume-store";
import { getTemplate } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "@phosphor-icons/react";

const SECTION_LABELS: Record<string, string> = {
  basics: "基本信息",
  work: "工作经历",
  education: "教育背景",
  skills: "技能",
  projects: "项目经历",
  awards: "获奖",
  certificates: "证书",
  publications: "出版物",
  volunteer: "志愿者",
  languages: "语言",
  interests: "兴趣",
  references: "推荐信",
};

export function EditingStep() {
  const resume = useResumeStore((s) => s.resume);
  const updateData = useResumeStore((s) => s.updateData);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const template = getTemplate(resume.theme.templateId);

  // Build list of available sections from template config
  const availableSections = useMemo(() => {
    if (!template) return [];
    return (Object.entries(template.sections) as [string, { enabled?: boolean; order: number; title?: string } | undefined][])
      .filter(([, cfg]) => cfg?.enabled)
      .sort(([, a], [, b]) => (a?.order ?? 999) - (b?.order ?? 999))
      .map(([key, cfg]) => ({
        key,
        label: cfg?.title || SECTION_LABELS[key] || key,
        order: cfg?.order ?? 999,
      }));
  }, [template]);

  const sectionData = editingSection
    ? (resume.data as Record<string, unknown>)[editingSection]
    : undefined;

  return (
    <div className="flex h-full w-full min-w-0">
      {/* 左侧：简历画布 — 70% */}
      <div className="flex-[7] min-w-0 flex h-full items-start justify-center overflow-auto p-6">
        <ResumeCanvas />
      </div>

      {/* 右侧：统一面板 — Double-Bezel — 30% */}
      <div className="flex-[3] min-w-0 flex h-full flex-col p-3">
        <div className="flex h-full flex-col rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-1.5">
          <div className="flex h-full flex-col rounded-[calc(2rem-0.375rem)] border border-white/[0.04] bg-white/[0.015] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-4">
                {/* 模板与样式（始终可见） */}
                <StylePanel />

                {/* 章节编辑区 */}
                {availableSections.length > 0 && (
                  <>
                    <div className="border-t border-white/[0.06]" />

                    {/* 章节快捷切换 */}
                    <div className="flex flex-wrap gap-1.5">
                      {availableSections.map((section) => (
                        <button
                          key={section.key}
                          onClick={() =>
                            setEditingSection(
                              editingSection === section.key ? null : section.key,
                            )
                          }
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            section.key === editingSection
                              ? "bg-primary/15 text-primary"
                              : "bg-white/[0.03] text-foreground-dim hover:bg-white/[0.06]"
                          }`}
                        >
                          {section.label}
                        </button>
                      ))}
                    </div>

                    {/* 章节内容编辑 */}
                    {editingSection && sectionData !== undefined && (
                      <SectionDataEditor
                        sectionKey={editingSection}
                        data={sectionData as Record<string, unknown>}
                        onChange={(newData) => {
                          updateData((draft) => {
                            (draft as Record<string, unknown>)[editingSection] = newData;
                          });
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
