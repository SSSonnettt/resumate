"use client";
import { useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import type { Basics } from "@resumate/shared";

interface Props {
  data: Basics;
  onChange: (data: Basics) => void;
}

export function HeaderForm({ data, onChange }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateField<K extends keyof Basics>(key: K, value: Basics[K]) {
    setErrors((prev) => ({ ...prev, [key]: "" }));
    onChange({ ...data, [key]: value });
  }

  const profiles = data.profiles ?? [];

  function addProfile() {
    updateField("profiles", [...profiles, { network: "", username: "", url: "" }]);
  }

  function updateProfile(index: number, patch: Partial<Basics["profiles"] extends (infer T)[] | undefined ? T : never>) {
    updateField("profiles", profiles.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeProfile(index: number) {
    updateField("profiles", profiles.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {/* 姓名 */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground-dim">姓名</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="张三"
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm outline-none transition-colors focus:border-primary/25"
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
      </div>

      {/* 职位 */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground-dim">职位</label>
        <input
          type="text"
          value={data.label ?? ""}
          onChange={(e) => updateField("label", e.target.value)}
          placeholder="前端工程师"
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm outline-none transition-colors focus:border-primary/25"
        />
      </div>

      {/* 邮箱 */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground-dim">邮箱</label>
        <input
          type="text"
          value={data.email ?? ""}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="zhangsan@example.com"
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm outline-none transition-colors focus:border-primary/25"
        />
      </div>

      {/* 电话 */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground-dim">电话</label>
        <input
          type="text"
          value={data.phone ?? ""}
          onChange={(e) => updateField("phone", e.target.value)}
          placeholder="13800000000"
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm outline-none transition-colors focus:border-primary/25"
        />
      </div>

      {/* 个人主页 */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground-dim">个人主页</label>
        <input
          type="text"
          value={data.url ?? ""}
          onChange={(e) => updateField("url", e.target.value)}
          placeholder="https://github.com/zhangsan"
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm outline-none transition-colors focus:border-primary/25"
        />
      </div>

      {/* 个人总结 */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground-dim">个人总结</label>
        <textarea
          value={data.summary ?? ""}
          onChange={(e) => updateField("summary", e.target.value)}
          placeholder="5年经验的资深前端工程师..."
          rows={3}
          className="w-full resize-y rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm outline-none transition-colors focus:border-primary/25"
        />
      </div>

      {/* 社交链接 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-foreground-dim">社交链接</label>
          <button
            type="button"
            onClick={addProfile}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/[0.06]"
          >
            <Plus size={12} weight="light" />
            添加
          </button>
        </div>
        <div className="space-y-2">
          {profiles.map((profile, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={profile.network}
                onChange={(e) => updateProfile(index, { network: e.target.value })}
                placeholder="GitHub"
                className="w-20 shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-2 text-sm outline-none transition-colors focus:border-primary/25"
              />
              <input
                type="text"
                value={profile.username}
                onChange={(e) => updateProfile(index, { username: e.target.value })}
                placeholder="用户名"
                className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm outline-none transition-colors focus:border-primary/25"
              />
              <button
                type="button"
                onClick={() => removeProfile(index)}
                className="shrink-0 rounded-lg p-1.5 text-foreground-muted/30 transition-colors hover:bg-destructive/[0.06] hover:text-destructive"
              >
                <Trash size={14} weight="light" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
