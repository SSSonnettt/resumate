"use client";
import { useState, useEffect } from "react";
import { Key, ArrowRight } from "@phosphor-icons/react";

const PRESETS = {
  anthropic: {
    label: "Anthropic",
    placeholder: "sk-ant-...",
    defaultBaseURL: "",
    defaultModel: "claude-sonnet-4-20250514",
  },
  deepseek: {
    label: "DeepSeek",
    placeholder: "sk-...",
    defaultBaseURL: "https://api.deepseek.com",
    defaultModel: "deepseek-v4-pro",
  },
  openai: {
    label: "OpenAI",
    placeholder: "sk-...",
    defaultBaseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
  },
  custom: {
    label: "自定义",
    placeholder: "输入 API Key...",
    defaultBaseURL: "",
    defaultModel: "",
  },
} as const;

export type ProviderKey = keyof typeof PRESETS;

export interface AIProviderConfig {
  provider: ProviderKey;
  apiKey: string;
  baseURL: string;
  model: string;
}

const STORAGE_KEY = "ai-provider-config";

function loadConfig(): AIProviderConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AIProviderConfig;
  } catch {
    return null;
  }
}

function saveConfig(config: AIProviderConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getProviderConfig(): AIProviderConfig | null {
  return loadConfig();
}

export function ApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<ProviderKey>("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [baseURL, setBaseURL] = useState("");
  const [model, setModel] = useState("");

  useEffect(() => {
    const saved = loadConfig();
    if (!saved) {
      setOpen(true);
      const preset = PRESETS.deepseek;
      setProvider("deepseek");
      setBaseURL(preset.defaultBaseURL);
      setModel(preset.defaultModel);
    } else {
      setProvider(saved.provider);
      setApiKey(saved.apiKey);
      setBaseURL(saved.baseURL);
      setModel(saved.model);
    }
  }, []);

  function handleProviderChange(p: ProviderKey) {
    setProvider(p);
    const preset = PRESETS[p];
    setBaseURL(preset.defaultBaseURL);
    if (!model || p !== (loadConfig()?.provider ?? "deepseek")) {
      setModel(preset.defaultModel);
    }
  }

  function save() {
    saveConfig({ provider, apiKey: apiKey.trim(), baseURL, model });
    setOpen(false);
  }

  function migrateLegacyKey() {
    const legacy = localStorage.getItem("ai-api-key");
    if (legacy) {
      setApiKey(legacy.trim());
      setProvider("anthropic");
      const preset = PRESETS.anthropic;
      setBaseURL(preset.defaultBaseURL);
      setModel(preset.defaultModel);
    }
  }

  if (!open) return null;

  const preset = PRESETS[provider];
  const isCustom = provider === "custom";
  const isValid =
    apiKey.trim() &&
    (!isCustom || (baseURL.trim() && model.trim()));

  const inputClasses =
    "w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/30 transition-all duration-300 outline-none focus:border-primary/30 focus:bg-white/[0.03] focus:shadow-[0_0_0_3px_var(--primary-glow)]";

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-reveal-fade-up">
      {/* Double-Bezel 玻璃模态框 */}
      <div className="w-full max-w-[420px] rounded-3xl border border-white/[0.06] bg-white/[0.005] p-[3px] shadow-[0_0_80px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="space-y-5 rounded-[calc(1.5rem-3px)] border border-white/[0.06] bg-card p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/[0.08] ring-1 ring-primary/10">
            <Key size={20} weight="light" className="text-primary" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              配置 AI 服务
            </h2>
            <p className="text-xs text-foreground-muted">
              Key 只保存在浏览器本地
            </p>
          </div>
        </div>

        {/* Provider 选择 */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground-dim tracking-wide">
            服务商
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(PRESETS) as ProviderKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleProviderChange(key)}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-300 ${
                  provider === key
                    ? "border-primary/30 bg-primary/[0.06] text-primary shadow-[0_0_12px_var(--primary-glow)]"
                    : "border-white/[0.04] bg-transparent text-foreground-dim hover:border-white/[0.08] hover:bg-white/[0.02]"
                }`}
              >
                {PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground-dim tracking-wide">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={preset.placeholder}
            className={inputClasses}
            onKeyDown={(e) => e.key === "Enter" && isValid && save()}
            autoFocus
          />
          {provider === "anthropic" && !apiKey && (
            <button
              onClick={migrateLegacyKey}
              className="mt-1.5 text-xs text-primary/60 transition-colors hover:text-primary"
            >
              从旧版本迁移 Key
            </button>
          )}
        </div>

        {/* 自定义字段 */}
        {isCustom && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground-dim tracking-wide">
                Base URL
              </label>
              <input
                type="text"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://api.example.com/v1"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground-dim tracking-wide">
                模型名称
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="your-model-name"
                className={inputClasses}
              />
            </div>
          </div>
        )}

        {/* 模型信息 */}
        {!isCustom && model && (
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] px-3.5 py-2.5">
            <p className="text-xs text-foreground-muted">
              <span className="text-foreground-dim">当前模型</span>{" "}
              <code className="rounded-md bg-white/[0.04] px-1.5 py-0.5 font-medium text-foreground">
                {model}
              </code>
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={save}
          disabled={!apiKey.trim()}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_var(--primary-glow),0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-300 active:scale-[0.97] active:shadow-[0_0_12px_var(--primary-glow)] disabled:opacity-40 disabled:shadow-none"
        >
          开始使用
          <ArrowRight
            size={14}
            weight="bold"
            className="transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-enabled:group-hover:translate-x-0.5"
          />
        </button>
        </div>
      </div>
    </div>
  );
}
