import { resumeSchema } from "@resumate/shared";

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
    const resume = resumeSchema.parse(args.resume);
    const issues: string[] = [];
    if (resume.modules.length === 0) {
      issues.push("简历没有任何模块");
    }
    const headerMod = resume.modules.find((m) => m.type === "header");
    if (!headerMod) {
      issues.push("缺少头部模块（姓名、联系方式）");
    } else {
      if (!headerMod.data.name) issues.push("姓名未填写");
    }
    return {
      valid: issues.length === 0,
      issues,
    };
  });

  return registry;
}
