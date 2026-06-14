"use client";
import { Plus, Trash, DotsSixVertical } from "@phosphor-icons/react";
import type { WorkItem } from "@resumate/shared";

interface Props {
  data: WorkItem[];
  onChange: (data: WorkItem[]) => void;
}

function emptyItem(): WorkItem {
  return { name: "", position: "", startDate: "", endDate: "", summary: "" };
}

export function WorkExperienceForm({ data, onChange }: Props) {
  const items = data ?? [];

  function updateItem(index: number, patch: Partial<WorkItem>) {
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
        <label className="text-xs font-medium text-foreground-dim">工作经历</label>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary transition-colors hover:bg-foreground/5"
        >
          <Plus size={12} weight="light" />
          添加经历
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="border border-foreground/10 bg-card p-3">
            <div className="mb-2 flex items-center gap-2">
              <DotsSixVertical size={14} weight="light" className="shrink-0 text-foreground-muted/30" />
              <span className="text-xs font-medium text-foreground-dim">经历 {index + 1}</span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-1 text-foreground-muted/30 transition-colors hover:bg-destructive/[0.06] hover:text-destructive"
              >
                <Trash size={14} weight="light" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">公司</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  placeholder="ABC科技"
                  className="w-full border border-foreground/10 bg-card px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">职位</label>
                <input
                  type="text"
                  value={item.position}
                  onChange={(e) => updateItem(index, { position: e.target.value })}
                  placeholder="高级前端工程师"
                  className="w-full border border-foreground/10 bg-card px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">开始日期</label>
                <input
                  type="text"
                  value={item.startDate ?? ""}
                  onChange={(e) => updateItem(index, { startDate: e.target.value || undefined })}
                  placeholder="2020.01"
                  className="w-full border border-foreground/10 bg-card px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-foreground-muted">结束日期</label>
                <input
                  type="text"
                  value={item.endDate ?? ""}
                  onChange={(e) => updateItem(index, { endDate: e.target.value || undefined })}
                  placeholder="至今"
                  className="w-full border border-foreground/10 bg-card px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="mb-1 block text-[10px] text-foreground-muted">描述（建议使用 STAR 法则）</label>
              <textarea
                value={item.summary ?? ""}
                onChange={(e) => updateItem(index, { summary: e.target.value })}
                placeholder="主导前端架构重构，将页面加载时间从 4.2s 优化至 1.1s（提升 74%）"
                rows={3}
                className="w-full resize-y border border-foreground/10 bg-card px-2.5 py-1.5 text-sm leading-6 outline-none transition-colors focus:border-accent"
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="border border-dashed border-foreground/10 bg-card px-3 py-6 text-center text-sm text-foreground-muted">
            暂无工作经历，点击上方按钮添加。
          </p>
        )}
      </div>
    </div>
  );
}
