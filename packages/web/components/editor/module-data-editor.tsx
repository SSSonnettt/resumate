"use client";
import { useMemo, useState } from "react";
import {
  customDataSchema,
  educationDataSchema,
  headerDataSchema,
  projectsDataSchema,
  skillsDataSchema,
  summaryDataSchema,
  workExperienceDataSchema,
  type Module,
} from "@resumate/shared";
import { useResumeStore } from "@/lib/stores/resume-store";
import { Button } from "@/components/ui/button";
import { AIEditInput } from "./ai-edit-input";
import { Sparkles } from "lucide-react";

const moduleLabels: Record<Module["type"], string> = {
  header: "基础信息",
  summary: "个人总结",
  "work-experience": "工作经历",
  education: "教育背景",
  skills: "技能",
  projects: "项目经历",
  custom: "自定义模块",
};

export function ModuleDataEditor({ module }: { module: Module }) {
  const updateModuleData = useResumeStore((state) => state.updateModuleData);
  const [draft, setDraft] = useState(() =>
    JSON.stringify(module.data, null, 2),
  );
  const [error, setError] = useState("");
  const [showAIEdit, setShowAIEdit] = useState(false);

  const schema = useMemo(() => getDataSchema(module.type), [module.type]);

  function save() {
    const parsedJson = parseJson(draft);
    if (!parsedJson.ok) {
      setError(parsedJson.error);
      return;
    }

    const parsedData = schema.safeParse(parsedJson.value);
    if (!parsedData.success) {
      setError("字段结构不符合该模块要求，请检查 JSON。");
      return;
    }

    updateModuleData(module.id, parsedData.data);
    setError("");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <div>
          <p className="text-xs font-medium text-slate-400">{module.type}</p>
          <h3 className="text-sm font-semibold text-slate-800">
            {moduleLabels[module.type]}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            onClick={() => setShowAIEdit(!showAIEdit)}
            className={`h-8 px-2 text-xs ${showAIEdit ? "text-blue-600" : ""}`}
          >
            <Sparkles size={12} className="mr-1" />
            AI 编辑
          </Button>
          <Button variant="ghost" onClick={save} className="h-8 px-2">
            保存
          </Button>
        </div>
      </div>
      {showAIEdit && (
        <div className="border-b border-slate-100 px-3 py-2">
          <AIEditInput
            moduleType={module.type}
            moduleData={module.data as Record<string, unknown>}
            onResult={(data) => {
              setDraft(JSON.stringify(data, null, 2));
              setShowAIEdit(false);
            }}
          />
        </div>
      )}
      <div className="p-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          spellCheck={false}
          rows={8}
          className="w-full resize-y rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs leading-5 text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
        />
        {error && <p className="mt-2 text-xs leading-5 text-rose-600">{error}</p>}
      </div>
    </div>
  );
}

function getDataSchema(type: Module["type"]) {
  switch (type) {
    case "header":
      return headerDataSchema;
    case "summary":
      return summaryDataSchema;
    case "work-experience":
      return workExperienceDataSchema;
    case "education":
      return educationDataSchema;
    case "skills":
      return skillsDataSchema;
    case "projects":
      return projectsDataSchema;
    case "custom":
      return customDataSchema;
  }
}

function parseJson(value: string):
  | { ok: true; value: unknown }
  | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false, error: "JSON 格式不正确。" };
  }
}
