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
    const input = args.input as string;
    const hasJD = /(职位描述|岗位职责|任职要求|job description|jd)/i.test(input);
    const hasResume = /(简历|resume|工作经历|教育背景)/i.test(input);
    return {
      intent: hasJD ? "jd_optimize" : hasResume ? "resume_enhance" : "blank_slate",
      hasJD,
      hasResume,
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
