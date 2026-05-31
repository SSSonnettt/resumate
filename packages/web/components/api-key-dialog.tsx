"use client";
import { useState, useEffect } from "react";

export function ApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("ai-api-key");
    if (!saved) {
      setOpen(true);
    } else {
      setKey(saved);
    }
  }, []);

  function save() {
    localStorage.setItem("ai-api-key", key.trim());
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[420px] space-y-4 shadow-xl">
        <h2 className="font-semibold text-lg">设置 AI API Key</h2>
        <p className="text-sm text-gray-500">
          你的 API Key 只保存在浏览器本地（localStorage），不会上传到任何服务器。
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === "Enter" && key.trim() && save()}
          autoFocus
        />
        <button
          onClick={save}
          disabled={!key.trim()}
          className="w-full rounded bg-blue-600 py-2 text-sm text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          开始使用
        </button>
      </div>
    </div>
  );
}
