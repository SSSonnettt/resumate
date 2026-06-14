"use client";
import { useState } from "react";
import { Spinner, Sparkle } from "@phosphor-icons/react";
import { getProviderConfig, type AIProviderConfig } from "@/components/api-key-dialog";

type SectionKey = "basics" | "work" | "education" | "skills" | "projects";

interface Props {
  sectionKey: SectionKey;
  sectionData: Record<string, unknown>;
  onResult: (data: Record<string, unknown>) => void;
  jdContext?: string;
}

export function AIEditInput({ sectionKey, sectionData, onResult, jdContext }: Props) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const trimmed = instruction.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");

    const config: AIProviderConfig | null = getProviderConfig();
    if (!config) {
      setError("未配置 AI 服务，请刷新页面后设置 API Key。");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/agent/edit-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: config.provider === "anthropic" ? "anthropic" : "openai-compat",
          apiKey: config.apiKey,
          baseURL: config.baseURL || undefined,
          model: config.model || undefined,
          section: sectionKey,
          data: sectionData,
          instruction: trimmed,
          jdContext: jdContext || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || result.error || `服务器错误 (${response.status})`);
        return;
      }

      if (result.success && result.data) {
        onResult(result.data);
        setInstruction("");
      } else {
        setError("AI 未返回有效数据，请重试。");
      }
    } catch (err) {
      setError(`请求失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder='例如：让这段更技术化、加一个关于 K8s 的项目...'
          className="flex-1 border border-[hsl(var(--border))] bg-card px-3 py-1.5 text-xs outline-none transition-colors focus:border-accent"
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={loading}
        />
        <button
          onClick={submit}
          disabled={loading || !instruction.trim()}
          className="inline-flex items-center gap-1 bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <Spinner size={12} weight="light" className="animate-spin" />
          ) : (
            <Sparkle size={12} weight="light" />
          )}
          编辑
        </button>
      </div>
      {error && (
        <p className="text-xs leading-5 text-destructive">{error}</p>
      )}
    </div>
  );
}
