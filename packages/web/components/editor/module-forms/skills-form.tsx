"use client";
import { useState } from "react";
import { Plus, Trash, X } from "@phosphor-icons/react";
import type { SkillItem } from "@resumate/shared";

interface Props {
  data: SkillItem[];
  onChange: (data: SkillItem[]) => void;
}

function emptySkill(): SkillItem {
  return { name: "", keywords: [] };
}

export function SkillsForm({ data, onChange }: Props) {
  const [keywordInputs, setKeywordInputs] = useState<Record<number, string>>({});

  function updateSkill(index: number, patch: Partial<SkillItem>) {
    const items = data.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(items);
  }

  function removeSkill(index: number) {
    onChange(data.filter((_, i) => i !== index));
  }

  function addSkill() {
    onChange([...data, emptySkill()]);
  }

  function addKeyword(skillIndex: number) {
    const kw = keywordInputs[skillIndex]?.trim();
    if (!kw) return;
    const skill = data[skillIndex];
    if (!skill) return;
    if (skill.keywords.includes(kw)) return;
    updateSkill(skillIndex, { keywords: [...skill.keywords, kw] });
    setKeywordInputs((prev) => ({ ...prev, [skillIndex]: "" }));
  }

  function removeKeyword(skillIndex: number, kwIndex: number) {
    const skill = data[skillIndex];
    if (!skill) return;
    updateSkill(skillIndex, { keywords: skill.keywords.filter((_, i) => i !== kwIndex) });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground-dim">技能</label>
        <button
          type="button"
          onClick={addSkill}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/[0.06]"
        >
          <Plus size={12} weight="light" />
          添加技能
        </button>
      </div>
      <div className="space-y-3">
        {data.map((skill, skillIndex) => (
          <div key={skillIndex} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="text"
                value={skill.name}
                onChange={(e) => updateSkill(skillIndex, { name: e.target.value })}
                placeholder="技能分类名（如：前端）"
                className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm font-medium outline-none transition-colors focus:border-primary/25"
              />
              <select
                value={skill.level ?? ""}
                onChange={(e) =>
                  updateSkill(skillIndex, { level: e.target.value || undefined })
                }
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-xs outline-none transition-colors focus:border-primary/25 text-foreground-muted"
              >
                <option value="">熟练度</option>
                <option value="Master">Master</option>
                <option value="Advanced">Advanced</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Beginner">Beginner</option>
              </select>
              <button
                type="button"
                onClick={() => removeSkill(skillIndex)}
                className="rounded-lg p-1 text-foreground-muted/30 transition-colors hover:bg-destructive/[0.06] hover:text-destructive"
              >
                <Trash size={14} weight="light" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skill.keywords.map((kw, kwIndex) => (
                <span
                  key={kwIndex}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/[0.08] px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(skillIndex, kwIndex)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-primary/[0.15]"
                  >
                    <X size={10} weight="light" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={keywordInputs[skillIndex] ?? ""}
                  onChange={(e) =>
                    setKeywordInputs((prev) => ({ ...prev, [skillIndex]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword(skillIndex);
                    }
                  }}
                  placeholder="添加关键词"
                  className="w-28 rounded-full border border-dashed border-white/[0.08] bg-white/[0.01] px-2.5 py-1 text-xs outline-none transition-colors focus:border-primary/25"
                />
                <button
                  type="button"
                  onClick={() => addKeyword(skillIndex)}
                  className="rounded-lg p-0.5 text-primary transition-colors hover:text-primary/80"
                >
                  <Plus size={14} weight="light" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] px-3 py-6 text-center text-sm text-foreground-muted">
            暂无技能，点击上方按钮添加。
          </p>
        )}
      </div>
    </div>
  );
}
