"use client";
import { useMemo, useState } from "react";
import { useResumeStore } from "@/lib/stores/resume-store";
import { Button } from "@/components/ui/button";
import { AIEditInput } from "./ai-edit-input";
import { getFormForSection } from "./module-forms";
import { Sparkle, CaretDown, CaretUp } from "@phosphor-icons/react";

const sectionLabels: Record<string, string> = {
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

interface Props {
  sectionKey: string;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export function SectionDataEditor({ sectionKey, data, onChange }: Props) {
  const [showAIEdit, setShowAIEdit] = useState(false);
  const [showJSON, setShowJSON] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState("");

  const FormComponent = useMemo(() => getFormForSection(sectionKey), [sectionKey]);

  function handleAIResult(data: Record<string, unknown>) {
    onChange(data);
    setShowAIEdit(false);
  }

  function openJSONTab() {
    setJsonDraft(JSON.stringify(data, null, 2));
    setJsonError("");
    setShowJSON(!showJSON);
  }

  function handleJSONApply() {
    try {
      const parsed = JSON.parse(jsonDraft);
      onChange(parsed);
      setJsonError("");
    } catch {
      setJsonError("JSON 格式不正确。");
    }
  }

  const label = sectionLabels[sectionKey] || sectionKey;

  const titleBar = (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
      <div>
        <p className="text-[10px] font-medium tracking-[0.15em] text-foreground-dim uppercase">{sectionKey}</p>
        <h3 className="text-sm font-semibold">{label}</h3>
      </div>
      <div className="flex items-center gap-1">
        {(sectionKey === "basics" || sectionKey === "work" || sectionKey === "education" || sectionKey === "skills" || sectionKey === "projects") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAIEdit(!showAIEdit)}
            className={`h-8 px-2 text-xs ${showAIEdit ? "text-primary" : ""}`}
          >
            <Sparkle size={12} weight="light" className="mr-1" />
            AI 编辑
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={openJSONTab}
          className="h-8 px-2 text-xs"
        >
          {showJSON ? (
            <CaretUp size={12} weight="light" className="mr-1" />
          ) : (
            <CaretDown size={12} weight="light" className="mr-1" />
          )}
          高级
        </Button>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.015]">
      {titleBar}

      {showAIEdit && (
        <div className="border-b border-white/[0.06] px-3 py-2">
          <AIEditInput
            sectionKey={sectionKey as "basics" | "work" | "education" | "skills" | "projects"}
            sectionData={data}
            onResult={handleAIResult}
          />
        </div>
      )}

      {FormComponent ? (
        <div className="p-3">
          <FormComponent data={data} onChange={onChange} />
        </div>
      ) : (
        /* fallback JSON editor */
        <div className="p-3">
          <textarea
            value={jsonDraft || JSON.stringify(data, null, 2)}
            onChange={(e) => setJsonDraft(e.target.value)}
            spellCheck={false}
            rows={6}
            className="w-full resize-y rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-xs leading-5 outline-none transition-colors focus:border-primary/25"
          />
          {jsonError && (
            <p className="mt-2 text-xs leading-5 text-destructive">{jsonError}</p>
          )}
          <div className="mt-2 flex justify-end">
            <Button onClick={handleJSONApply} size="sm" className="h-7 px-3 text-xs">
              应用
            </Button>
          </div>
        </div>
      )}

      {showJSON && FormComponent && (
        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-dim">
              高级：编辑 JSON
            </span>
            <Button onClick={handleJSONApply} size="sm" className="h-7 px-3 text-xs">
              应用
            </Button>
          </div>
          <textarea
            value={jsonDraft || JSON.stringify(data, null, 2)}
            onChange={(e) => setJsonDraft(e.target.value)}
            spellCheck={false}
            rows={8}
            className="w-full resize-y rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-xs leading-5 outline-none transition-colors focus:border-primary/25"
          />
          {jsonError && (
            <p className="mt-2 text-xs leading-5 text-destructive">{jsonError}</p>
          )}
        </div>
      )}
    </div>
  );
}
