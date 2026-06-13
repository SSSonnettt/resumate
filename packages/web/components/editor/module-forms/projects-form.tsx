"use client";
import { Plus, Trash, DotsSixVertical } from "@phosphor-icons/react";
import type { ProjectItem } from "@resumate/shared";

interface Props {
  data: ProjectItem[];
  onChange: (data: ProjectItem[]) => void;
}

function emptyItem(): ProjectItem {
  return { name: "", description: "", keywords: [], url: "" };
}

export function ProjectsForm({ data, onChange }: Props) {
  const items = data ?? [];

  function updateItem(index: number, patch: Partial<ProjectItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem() {
    onChange([...items, emptyItem()]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground-dim">项目经历</label>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/[0.06]"
        >
          <Plus size={12} weight="light" />
          添加项目
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
            <div className="mb-2 flex items-center gap-2">
              <DotsSixVertical size={14} weight="light" className="shrink-0 text-foreground-muted/30" />
              <span className="text-xs font-medium text-foreground-dim">项目 {index + 1}</span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="rounded-lg p-1 text-foreground-muted/30 transition-colors hover:bg-destructive/[0.06] hover:text-destructive"
              >
                <Trash size={14} weight="light" />
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">项目名称</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  placeholder="电商平台重构"
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary/25"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">链接</label>
                <input
                  type="text"
                  value={item.url ?? ""}
                  onChange={(e) => updateItem(index, { url: e.target.value || undefined })}
                  placeholder="https://github.com/..."
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary/25"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">描述</label>
                <textarea
                  value={item.description ?? ""}
                  onChange={(e) => updateItem(index, { description: e.target.value })}
                  placeholder="负责前端架构设计..."
                  rows={2}
                  className="w-full resize-y rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm leading-6 outline-none transition-colors focus:border-primary/25"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">技术栈（逗号分隔）</label>
                <input
                  type="text"
                  value={item.keywords?.join(", ") ?? ""}
                  onChange={(e) =>
                    updateItem(index, {
                      keywords: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="React, TypeScript, Node.js"
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary/25"
                />
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] px-3 py-6 text-center text-sm text-foreground-muted">
            暂无项目经历，点击上方按钮添加。
          </p>
        )}
      </div>
    </div>
  );
}
