"use client";
import { memo, useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useResumeStore } from "@/lib/stores/resume-store";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { ShadowRenderer } from "@/components/themes/shadow-renderer";
import { A4_PX } from "@/lib/page-layout";
import type { ResumeData } from "@resumate/shared";

interface Props {
  /** 控制各 section 在预览中的可见性；不传则全部显示 */
  visibleSections?: Record<string, boolean>;
  /** 外层容器 DOM id，供 PDF 导出等场景定位元素 */
  containerId?: string;
}

export const ResumeCanvas = memo(function ResumeCanvas({ visibleSections, containerId }: Props) {
  const resume = useResumeStore((s) => s.resume);
  const completedSteps = useWizardStore((s) => s.completedSteps);

  const { data: rawData, themeSlug } = resume;

  /** 根据 visibleSections 过滤简历数据 */
  const data: ResumeData = useMemo(() => {
    if (!visibleSections) return rawData;
    const filtered: ResumeData = {};
    const allKeys = Object.keys(rawData) as (keyof ResumeData)[];
    for (const key of allKeys) {
      const sectionKey = String(key);
      // visibleSections 中未定义或为 true 的 section 保留
      if (visibleSections[sectionKey] !== false) {
        (filtered as Record<string, unknown>)[sectionKey] = rawData[key];
      }
    }
    return filtered;
  }, [rawData, visibleSections]);

  // ---- A4 等比缩放 ----
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [wrapperHeight, setWrapperHeight] = useState<number | undefined>();

  useEffect(() => {
    const parent = wrapperRef.current?.parentElement;
    if (!parent) return;

    const calcScale = () => {
      const style = getComputedStyle(parent);
      const padH =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const availableWidth = parent.clientWidth - padH;
      const s = Math.max(0.3, Math.min(1, availableWidth / A4_PX.width));
      setScale(Number(s.toFixed(4)));
    };

    calcScale();
    const ro = new ResizeObserver(calcScale);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  const updateWrapperHeight = useCallback(() => {
    if (!contentRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setWrapperHeight(entry.contentRect.height * scale);
    });
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [scale]);

  useEffect(() => {
    const cleanup = updateWrapperHeight();
    return cleanup;
  }, [updateWrapperHeight, data, themeSlug]);

  const hasPassedGeneration = completedSteps.includes("generating");
  // 即使已通过生成步骤，如果简历数据中没有 basics（姓名等基本信息），说明数据为空
  const hasResumeData = Boolean(rawData.basics);

  // 无简历数据 → 提示用户（无论是否通过生成步骤）
  if (!hasPassedGeneration || !hasResumeData) {
    return (
      <div
        id={containerId}
        ref={wrapperRef}
        className="mx-auto"
        style={{
          width: A4_PX.width * scale,
          height: A4_PX.height * scale,
        }}
      >
        <div
          ref={contentRef}
          style={{
            width: A4_PX.width,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {/* Industrial 结构边框 · 外壳 */}
          <div
            className="a4-page mx-auto border-2 border-foreground/10 bg-card p-[3px]"
            style={{ width: A4_PX.width, contain: "layout style" }}
          >
            {/* Industrial 结构边框 · 内核 · A4 白纸 */}
            <div
              className="border border-foreground/10 bg-background p-10"
              style={{ minHeight: A4_PX.height - 4 }}
            >
              {/* 空状态：渐现动画 */}
              <div className="flex h-full flex-col items-center justify-center pt-20 animate-reveal-fade-up">
                {/* 工业文件图标占位 */}
                <div className="mb-6 flex size-16 items-center justify-center border border-foreground/10 bg-foreground/5">
                  <svg
                    className="size-6 text-foreground-muted/30 animate-pulse-hard"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                    <path d="M14 2v6h6" />
                    <path d="M12 18v-6" />
                    <path d="M9 15h6" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground-dim/60 tracking-tight">
                  {!hasPassedGeneration
                    ? "从左侧添加内容开始编辑简历"
                    : "简历数据为空，请返回上一步重新生成"}
                </p>
                <p className="mt-2 text-xs text-foreground-muted/30">
                  完成 AI 生成后即可在此编辑
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 已通过生成步骤 → 始终渲染 ShadowRenderer（主题能处理空数据）

  return (
    <div
      id={containerId}
      ref={wrapperRef}
      className="mx-auto"
      style={{
        width: A4_PX.width * scale,
        height: wrapperHeight,
        overflow: "hidden",
      }}
    >
      <div
        ref={contentRef}
        style={{
          width: A4_PX.width,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Industrial 结构边框 · 外壳 */}
        <div
          className="a4-page mx-auto border-2 border-foreground/10 bg-card p-[3px]"
          style={{ width: A4_PX.width }}
        >
          {/* Industrial 结构边框 · 内核 · A4 白纸 */}
          <div
            className="border border-foreground/10 bg-background p-10"
            style={{ minHeight: A4_PX.height - 4 }}
          >
            <ShadowRenderer
              data={data}
              themeSlug={themeSlug}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
