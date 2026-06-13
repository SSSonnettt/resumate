"use client";
import { Plus, Trash, DotsSixVertical } from "@phosphor-icons/react";
import type { EducationItem } from "@resumate/shared";

interface Props {
  data: EducationItem[];
  onChange: (data: EducationItem[]) => void;
}

function emptyItem(): EducationItem {
  return { institution: "", studyType: "", area: "", startDate: "", endDate: "" };
}

export function EducationForm({ data, onChange }: Props) {
  function updateItem(index: number, patch: Partial<EducationItem>) {
    const items = data.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(items);
  }

  function removeItem(index: number) {
    onChange(data.filter((_, i) => i !== index));
  }

  function addItem() {
    onChange([...data, emptyItem()]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground-dim">教育背景</label>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/[0.06]"
        >
          <Plus size={12} weight="light" />
          添加
        </button>
      </div>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
            <div className="mb-2 flex items-center gap-2">
              <DotsSixVertical size={14} weight="light" className="shrink-0 text-foreground-muted/30" />
              <span className="text-xs font-medium text-foreground-dim">教育 {index + 1}</span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="rounded-lg p-1 text-foreground-muted/30 transition-colors hover:bg-destructive/[0.06] hover:text-destructive"
              >
                <Trash size={14} weight="light" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">学校</label>
                <input
                  type="text"
                  value={item.institution}
                  onChange={(e) => updateItem(index, { institution: e.target.value })}
                  placeholder="清华大学"
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary/25"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">学位</label>
                <input
                  type="text"
                  value={item.studyType ?? ""}
                  onChange={(e) => updateItem(index, { studyType: e.target.value })}
                  placeholder="本科"
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary/25"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">专业</label>
                <input
                  type="text"
                  value={item.area ?? ""}
                  onChange={(e) => updateItem(index, { area: e.target.value })}
                  placeholder="计算机科学"
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary/25"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">GPA</label>
                <input
                  type="text"
                  value={item.score ?? ""}
                  onChange={(e) => updateItem(index, { score: e.target.value })}
                  placeholder="3.8/4.0"
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary/25"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">开始</label>
                <input
                  type="text"
                  value={item.startDate ?? ""}
                  onChange={(e) => updateItem(index, { startDate: e.target.value })}
                  placeholder="2016"
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary/25"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">结束</label>
                <input
                  type="text"
                  value={item.endDate ?? ""}
                  onChange={(e) => updateItem(index, { endDate: e.target.value || undefined })}
                  placeholder="2020"
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary/25"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="mb-1 block text-[10px] text-foreground-muted">相关课程（逗号分隔）</label>
              <input
                type="text"
                value={item.courses?.join(", ") ?? ""}
                onChange={(e) =>
                  updateItem(index, {
                    courses: e.target.value
                      ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      : undefined,
                  })
                }
                placeholder="数据结构, 操作系统, 计算机网络"
                className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-primary/25"
              />
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] px-3 py-6 text-center text-sm text-foreground-muted">
            暂无教育背景，点击上方按钮添加。
          </p>
        )}
      </div>
    </div>
  );
}
