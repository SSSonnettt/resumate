"use client";
import { useRef, useState, useEffect, useLayoutEffect } from "react";
import type { ResumeData } from "@resumate/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner, ArrowsClockwise } from "@phosphor-icons/react";

interface Props {
  data: ResumeData;
  themeSlug: string;
}

type RenderStatus = "loading" | "rendered" | "error";

/**
 * 将主题 HTML 片段包装为完整的独立 HTML 文档，用于 iframe srcdoc。
 */
function wrapFullDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body { margin: 0; padding: 0; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/**
 * 创建 iframe 元素，设置 srcdoc 并绑定自适应高度。
 */
function createIframe(srcdoc: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.className = "w-full border-0 bg-white";
  iframe.style.cssText = "display:block;min-height:100%;width:100%;";
  iframe.sandbox.add("allow-same-origin");
  iframe.title = "Resume Preview";

  // 加载完成后自适应高度
  iframe.onload = () => {
    try {
      const doc = iframe.contentDocument;
      if (doc) {
        const height = doc.documentElement.scrollHeight;
        iframe.style.height = height + "px";
      }
    } catch {
      // sandbox 限制时忽略
    }
  };

  iframe.srcdoc = srcdoc;
  return iframe;
}

/**
 * ShadowRenderer — 使用 iframe + srcdoc 渲染 jsonresume 社区主题。
 *
 * 加载策略：
 * - 首次加载（无所见内容）：显示骨架屏
 * - 切换主题（已有旧 iframe）：保留旧内容可见，叠加半透明 spinner
 * - 新 HTML 就绪后无缝替换 iframe
 */
export function ShadowRenderer({ data, themeSlug }: Props) {
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<RenderStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const lastRenderKeyRef = useRef("");
  const renderingRef = useRef(false);
  const hasRenderedRef = useRef(false);
  const [retryCount, setRetryCount] = useState(0);

  // ============ Effect 1: 获取 HTML ============
  useEffect(() => {
    let cancelled = false;

    async function fetchAndSetStatus() {
      if (renderingRef.current) return;

      const renderKey = themeSlug + "::" + JSON.stringify(data);
      if (renderKey === lastRenderKeyRef.current && status === "rendered") return;

      renderingRef.current = true;
      setStatus("loading");

      try {
        const res = await fetch("/api/themes/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: themeSlug, data }),
        });

        if (cancelled) return;

        if (!res.ok) {
          if (themeSlug !== "flat") {
            console.warn(`[IframeRenderer] 主题 ${themeSlug} 不可用，回退到 flat`);
            const fallbackRes = await fetch("/api/themes/render", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug: "flat", data }),
            });
            if (cancelled) return;
            if (!fallbackRes.ok) {
              const errData = await fallbackRes.json().catch(() => ({ error: fallbackRes.statusText }));
              throw new Error(errData.error || `HTTP ${fallbackRes.status}`);
            }
            const fallbackHtml = await fallbackRes.text();
            if (cancelled) return;
            if (iframeContainerRef.current) {
              iframeContainerRef.current.dataset.pendingHtml = fallbackHtml;
            }
            lastRenderKeyRef.current = renderKey;
            setStatus("rendered");
            return;
          }
          const errData = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const bodyHtml = await res.text();
        if (cancelled) return;

        if (iframeContainerRef.current) {
          iframeContainerRef.current.dataset.pendingHtml = bodyHtml;
        }
        lastRenderKeyRef.current = renderKey;
        setStatus("rendered");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        setStatus("error");
      } finally {
        if (!cancelled) {
          renderingRef.current = false;
        }
      }
    }

    fetchAndSetStatus();

    return () => {
      cancelled = true;
      renderingRef.current = false;
    };
  }, [data, themeSlug, retryCount]);

  // ============ Effect 2: 当 status → "rendered" 时替换 iframe ============
  useLayoutEffect(() => {
    if (status !== "rendered") return;

    const container = iframeContainerRef.current;
    if (!container) return;

    const pendingHtml = container.dataset.pendingHtml;
    if (!pendingHtml) return;

    delete container.dataset.pendingHtml;

    // 移除旧 iframe
    const oldIframe = container.querySelector("iframe");
    if (oldIframe) oldIframe.remove();

    const iframe = createIframe(wrapFullDocument(pendingHtml));
    container.appendChild(iframe);

    hasRenderedRef.current = true;
  }, [status]);

  const showFirstLoadSkeleton = status === "loading" && !hasRenderedRef.current;
  const showLoadingOverlay = status === "loading" && hasRenderedRef.current;

  return (
    <div className="shadow-resume-host relative">
      {/* 首次加载：骨架屏 */}
      {showFirstLoadSkeleton && (
        <div className="space-y-4 p-6">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="mt-4 space-y-3">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {status === "error" && (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-red-500">主题渲染失败</p>
          <p className="text-xs text-slate-400 max-w-xs break-all">
            {errorMessage}
          </p>
          <button
            onClick={() => {
              lastRenderKeyRef.current = "";
              renderingRef.current = false;
              setRetryCount((c) => c + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ArrowsClockwise size={14} />
            重试
          </button>
        </div>
      )}

      {/* iframe 容器 */}
      <div ref={iframeContainerRef} />

      {/* 切换主题时的加载覆盖层 —— 绝对定位覆盖在旧 iframe 上 */}
      {showLoadingOverlay && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2">
            <Spinner
              size={28}
              weight="light"
              className="animate-spin text-slate-400"
            />
            <span className="text-xs text-slate-400">切换中...</span>
          </div>
        </div>
      )}
    </div>
  );
}
