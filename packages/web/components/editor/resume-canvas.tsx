"use client";
import { memo, useRef, useState, useEffect, useCallback } from "react";
import { useResumeStore } from "@/lib/stores/resume-store";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { ResumeRenderer } from "@/components/renderers/resume-renderer";
import { getTemplate } from "@/lib/templates";
import { A4_PX } from "@/lib/page-layout";

export function ResumeCanvas() {
  const resume = useResumeStore((s) => s.resume);
  const completedSteps = useWizardStore((s) => s.completedSteps);
  const goBack = useWizardStore((s) => s.goBack);

  const template = getTemplate(resume.theme.templateId);
  const { data, theme } = resume;

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
  }, [updateWrapperHeight, data, theme]);

  const hasPassedGeneration = completedSteps.includes("generating");

  const hasContent =
    data.basics?.name ||
    (data.work && data.work.length > 0) ||
    (data.education && data.education.length > 0) ||
    (data.skills && data.skills.length > 0);

  if (!hasContent || !template) {
    return (
      <div
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
          <div
            className="a4-page mx-auto rounded-2xl border border-white/[0.08] bg-white/[0.015] p-0.5 shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
            style={{ width: A4_PX.width, contain: "layout style" }}
          >
            <div
              className="rounded-[calc(1.5rem-0.125rem)] bg-white p-10 shadow-sm"
              style={{ minHeight: A4_PX.height - 4 }}
            >
              {hasPassedGeneration ? (
                <div className="flex flex-col items-center justify-center pt-20 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    AI 生成未产出内容
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    管线可能因数据不足或格式错误未能生成简历内容。
                  </p>
                  <button
                    onClick={goBack}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    返回上一步重试
                  </button>
                </div>
              ) : (
                <p className="pt-20 text-center text-slate-300">
                  从左侧添加内容开始编辑简历
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
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
        <div
          className="a4-page mx-auto rounded-2xl border border-white/[0.08] bg-white/[0.015] p-0.5 shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
          style={{ width: A4_PX.width }}
        >
          <div
            className="rounded-[calc(1.5rem-0.125rem)] bg-white p-10 shadow-sm"
            style={{ minHeight: A4_PX.height - 4 }}
          >
            <ResumeRenderer
              data={data}
              template={template}
              colors={theme.colors}
              typography={theme.typography}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
