"use client";
import { useState, useEffect } from "react";

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
      // 默认用 DeepSeek
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
    // 切换 provider 时不重置已保存的 model
    if (!model || p !== (loadConfig()?.provider ?? "deepseek")) {
      setModel(preset.defaultModel);
    }
  }

  function save() {
    saveConfig({ provider, apiKey: apiKey.trim(), baseURL, model });
    setOpen(false);
  }

  // 兼容旧版 localStorage key
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
  const isValid = apiKey.trim() && (provider !== "anthropic" || true) && (!isCustom || (baseURL.trim() && model.trim()));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[420px] space-y-4 shadow-xl">
        <h2 className="font-semibold text-lg">设置 AI 服务</h2>
        <p className="text-sm text-gray-500">
          你的 API Key 只保存在浏览器本地（localStorage），不会上传到任何服务器。
        </p>

        {/* Provider 选择 */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">服务商</label>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as ProviderKey)}
            className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(PRESETS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={preset.placeholder}
            className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && isValid && save()}
            autoFocus
          />
          {provider === "anthropic" && !apiKey && (
            <button
              onClick={migrateLegacyKey}
              className="mt-1 text-xs text-blue-500 hover:text-blue-600"
            >
              迁移旧版 Key
            </button>
          )}
        </div>

        {/* 自定义字段 */}
        {isCustom && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Base URL</label>
              <input
                type="text"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">模型名称</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="your-model-name"
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {/* 非自定义时显示模型名 */}
        {!isCustom && model && (
          <p className="text-xs text-slate-400">
            模型：{model}（可在自定义模式下修改）
          </p>
        )}

        <button
          onClick={save}
          disabled={!apiKey.trim()}
          className="w-full rounded bg-blue-600 py-2 text-sm text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          开始使用
        </button>
      </div>
    </div>
  );
}
