import { describe, expect, it } from "vitest";
import { createEmptyResume, type Resume, type HarnessEvent } from "@resumate/shared";
import { scoreResume, buildTrace } from "./evaluate";

// 构建一个较完整的测试简历
function createTestResume(): Resume {
  const resume = createEmptyResume("test-resume");
  resume.data.basics = { name: "张三", label: "前端工程师" };
  resume.data.work = [
    {
      id: "w1",
      name: "ABC科技",
      position: "高级前端",
      startDate: "2020.01",
      endDate: "2023.06",
      summary:
        "主导前端架构重构，将页面加载时间从 4.2s 优化至 1.1s（提升 74%），支撑 GMV 增长 120%",
    },
  ];
  resume.data.education = [
    { id: "e1", institution: "清华", studyType: "本科", area: "CS", startDate: "2016", endDate: "2020" },
  ];
  resume.data.skills = [
    { id: "sk1", name: "前端", keywords: ["React", "TypeScript"] },
  ];
  return resume;
}

describe("scoreResume", () => {
  it("scores an empty resume low", () => {
    const empty = createEmptyResume("empty");
    const score = scoreResume(empty);
    expect(score.completeness).toBe(0);
    expect(score.contentQuality).toBe(0);
    expect(score.overall).toBeLessThanOrEqual(10);
  });

  it("scores a complete resume high", () => {
    const resume = createTestResume();
    const score = scoreResume(resume);
    // 完整简历应该有较高的 completeness
    expect(score.completeness).toBe(100);
    // contentQuality 因为有 STAR 要素和量化指标应该 > 0
    expect(score.contentQuality).toBeGreaterThan(0);
    expect(score.overall).toBeGreaterThan(50);
  });

  it("returns lower score for resume missing required sections", () => {
    const resume = createTestResume();
    // 移除 education 和 skills 数据
    delete resume.data.education;
    delete resume.data.skills;
    const score = scoreResume(resume);
    expect(score.completeness).toBeLessThan(100);
    expect(score.completeness).toBe(50); // 只剩 basics 和 work
  });

  it("computes ATS compatibility from JD keywords", () => {
    const resume = createTestResume();
    const jdKeywords = ["React", "TypeScript", "Node.js", "Webpack", "Vue"];
    const score = scoreResume(resume, jdKeywords);
    // React 和 TypeScript 应该匹配
    expect(score.atsCompatibility).toBe(40); // 2/5 = 40%
  });

  it("returns 0 ATS compatibility when no JD keywords provided", () => {
    const resume = createTestResume();
    const score = scoreResume(resume);
    expect(score.atsCompatibility).toBe(0);
  });

  it("detects STAR elements and quantitative indicators in work experience", () => {
    const resume = createTestResume();
    const score = scoreResume(resume);
    // 描述中包含 "主导"（行动）、"4.2s" "74%" "120%"（结果/量化）
    expect(score.contentQuality).toBeGreaterThan(0);
  });
});

describe("buildTrace", () => {
  it("builds execution trace from HarnessEvent stream", () => {
    const events: HarnessEvent[] = [
      { type: "plan:start", planId: "test-plan" },
      { type: "step:start", stepId: "classify", description: "分类" },
      { type: "step:done", stepId: "classify", result: { intent: "new_resume" } },
      { type: "step:start", stepId: "generate", description: "生成" },
      { type: "step:chunk", stepId: "generate", text: "好的..." },
      { type: "step:done", stepId: "generate", result: {} },
      { type: "plan:done", resume: createEmptyResume("r1") },
    ];

    const trace = buildTrace(events);

    expect(trace.planId).toBe("test-plan");
    expect(trace.steps).toHaveLength(2);
    expect(trace.steps[0]).toMatchObject({
      stepId: "classify",
      success: true,
    });
    expect(trace.steps[1]).toMatchObject({
      stepId: "generate",
      success: true,
    });
  });

  it("marks failed steps in trace", () => {
    const events: HarnessEvent[] = [
      { type: "plan:start", planId: "fail-plan" },
      { type: "step:start", stepId: "bad-step", description: "会失败" },
      { type: "plan:error", stepId: "bad-step", error: "工具不存在" },
    ];

    const trace = buildTrace(events);
    expect(trace.steps).toHaveLength(1);
    expect(trace.steps[0]).toMatchObject({
      stepId: "bad-step",
      success: false,
      errorMessage: "工具不存在",
    });
  });

  it("skips steps marked as skipped", () => {
    const events: HarnessEvent[] = [
      { type: "plan:start", planId: "skip-plan" },
      { type: "step:start", stepId: "optional", description: "可选" },
      { type: "step:skipped", stepId: "optional", reason: "条件不满足" },
      { type: "step:start", stepId: "main", description: "主步骤" },
      { type: "step:done", stepId: "main", result: {} },
      { type: "plan:done", resume: createEmptyResume("r2") },
    ];

    const trace = buildTrace(events);
    // skipped 步骤不会出现在 trace 中
    expect(trace.steps).toHaveLength(1);
    expect(trace.steps[0].stepId).toBe("main");
  });
});
