import { scoreResume } from "./evaluate";

export interface ToolFn {
  (args: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolFn>();

  register(name: string, fn: ToolFn): void {
    this.tools.set(name, fn);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async execute(
    name: string,
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    return tool(args);
  }
}

// 内置工具
export function createBuiltInTools(): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register("classifyIntent", async (args) => {
    const input = (args.input as string) || "";

    // JD 特征：包含结构化岗位描述关键词
    const hasJD =
      /(职位描述|岗位职责|任职要求|job description|jd|岗位要求|职位要求|工作职责)/i.test(
        input,
      );

    // 用户个人信息特征：第一人称描述、具体公司名+职位、时间段等
    // 注意：JD 中也会出现"工作经历""教育背景"等词，但它们是作为"要求"出现的
    // 判断用户真实信息的关键：是否包含具体个人标识
    const personalMarkers = [
      /(我叫|我是|我的|本人|我毕业于|我在|我做|我负责|我参与)/i,
      /(联系方式|手机|电话|邮箱|微信).*[：:]\s*\S+/,
      /(姓名|名字).*[：:]\s*\S+/,
      /(20\d{2}[\.\-年]\d{1,2}).*(20\d{2}|至今|现在)/, // 时间段
    ];

    const hasPersonalInfo = personalMarkers.some((pattern) =>
      pattern.test(input),
    );

    return {
      intent: hasJD
        ? "jd_optimize"
        : hasPersonalInfo
          ? "resume_enhance"
          : "blank_slate",
      hasJD,
      hasResume: hasPersonalInfo,
    };
  });

  registry.register("validateResume", async (args) => {
    // 尝试解析为原始 JSON Resume 数据或已包装的 ResumeV4
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawResume = args.resume as any;
    // 如果是包装后的 ResumeV4 格式 { id, data, themeSlug }，提取 data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = (rawResume && typeof rawResume === "object" && rawResume.data) ? rawResume.data : rawResume;

    const issues: string[] = [];

    // 结构验证
    const hasAnyContent =
      (data.work && data.work.length > 0) ||
      (data.education && data.education.length > 0) ||
      (data.skills && data.skills.length > 0);

    if (!hasAnyContent) {
      issues.push("简历缺少实质性内容（工作/教育/技能至少需要一项）");
    }
    if (!data.basics?.name) {
      issues.push("姓名未填写");
    }

    // 质量评分
    const jdKeywords = args.jdKeywords as string[] | undefined;
    const score = scoreResume({ id: "", data, themeSlug: "flat" }, jdKeywords);

    if (score.contentQuality < 60) {
      issues.push("内容质量偏低：建议加强 STAR 法则和量化指标");
    }
    if (jdKeywords && jdKeywords.length > 0 && score.atsCompatibility < 50) {
      issues.push("ATS 兼容性偏低：建议增加 JD 关键词匹配");
    }

    // 综合判断：结构无严重问题 且 质量评分 ≥ 50 即为有效
    const structuralOk = hasAnyContent && !!data.basics?.name;

    return {
      valid: structuralOk && score.overall >= 50,
      issues,
      score,
    };
  });

  return registry;
}
