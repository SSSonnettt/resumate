import { z } from "zod";

// ============================================================
// JSON Resume 标准 Schema (https://jsonresume.org/schema/)
// ============================================================

// --- Location ---
export const locationSchema = z.object({
  address: z.string().optional().describe("街道地址"),
  postalCode: z.string().optional().describe("邮编"),
  city: z.string().optional().describe("城市"),
  countryCode: z.string().optional().describe("国家代码, e.g. CN"),
  region: z.string().optional().describe("省/州"),
});
export type Location = z.infer<typeof locationSchema>;

// --- Profile ---
export const profileSchema = z.object({
  network: z.string().describe("平台名称, e.g. GitHub"),
  username: z.string().describe("用户名"),
  url: z.string().url().optional().describe("主页链接"),
});
export type Profile = z.infer<typeof profileSchema>;

// --- Basics ---
export const basicsSchema = z.object({
  name: z.string().optional().describe("姓名"),
  label: z.string().optional().describe("当前职位/头衔"),
  image: z.string().url().optional().describe("照片 URL"),
  email: z.string().email().optional().describe("邮箱"),
  phone: z.string().optional().describe("电话"),
  url: z.string().url().optional().describe("个人主页"),
  summary: z.string().optional().describe("简短自我介绍"),
  location: locationSchema.optional(),
  profiles: z.array(profileSchema).optional().describe("社交/技术平台链接"),
});
export type Basics = z.infer<typeof basicsSchema>;

// --- Work ---
export const workItemSchema = z.object({
  id: z.string().optional().describe("内部 UUID"),
  name: z.string().describe("公司名称"),
  position: z.string().describe("职位"),
  url: z.string().url().optional().describe("公司网站"),
  startDate: z.string().optional().describe("YYYY-MM-DD 或 YYYY-MM"),
  endDate: z.string().optional().describe("YYYY-MM-DD 或 YYYY-MM"),
  summary: z.string().optional().describe("工作内容概述"),
  highlights: z.array(z.string()).optional().describe("亮点/成就"),
  location: z.string().optional().describe("工作城市"),
});
export type WorkItem = z.infer<typeof workItemSchema>;

// --- Education ---
export const educationItemSchema = z.object({
  id: z.string().optional(),
  institution: z.string().describe("学校名称"),
  url: z.string().url().optional(),
  area: z.string().optional().describe("专业/领域"),
  studyType: z.string().optional().describe("学位类型, e.g. 学士/硕士/博士"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  score: z.string().optional().describe("GPA / 成绩"),
  courses: z.array(z.string()).optional().describe("相关课程"),
});
export type EducationItem = z.infer<typeof educationItemSchema>;

// --- Skills ---
export const skillItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().describe("技能分类名"),
  level: z.string().optional().describe("熟练度, e.g. Master/Advanced/Intermediate"),
  keywords: z.array(z.string()).describe("具体技能关键词"),
});
export type SkillItem = z.infer<typeof skillItemSchema>;

// --- Projects ---
export const projectItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().describe("项目名称"),
  description: z.string().optional().describe("项目描述"),
  highlights: z.array(z.string()).optional().describe("项目亮点"),
  keywords: z.array(z.string()).optional().describe("使用技术栈"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  url: z.string().url().optional(),
  roles: z.array(z.string()).optional().describe("担任角色"),
  entity: z.string().optional().describe("所属公司/组织"),
  type: z.string().optional().describe("项目类型: personal/work/school"),
});
export type ProjectItem = z.infer<typeof projectItemSchema>;

// --- Awards ---
export const awardItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().describe("奖项名称"),
  date: z.string().optional(),
  awarder: z.string().optional().describe("颁发机构"),
  summary: z.string().optional().describe("奖项说明"),
});
export type AwardItem = z.infer<typeof awardItemSchema>;

// --- Certificates ---
export const certificateItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().describe("证书名称"),
  date: z.string().optional(),
  issuer: z.string().optional().describe("颁发机构"),
  url: z.string().url().optional(),
});
export type CertificateItem = z.infer<typeof certificateItemSchema>;

// --- Publications ---
export const publicationItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().describe("出版物名称"),
  publisher: z.string().optional().describe("出版社/期刊"),
  releaseDate: z.string().optional(),
  url: z.string().url().optional(),
  summary: z.string().optional(),
});
export type PublicationItem = z.infer<typeof publicationItemSchema>;

// --- Volunteer ---
export const volunteerItemSchema = z.object({
  id: z.string().optional(),
  organization: z.string().describe("组织名称"),
  position: z.string().optional().describe("角色"),
  url: z.string().url().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});
export type VolunteerItem = z.infer<typeof volunteerItemSchema>;

// --- Languages ---
export const languageItemSchema = z.object({
  id: z.string().optional(),
  language: z.string().describe("语言名称"),
  fluency: z.string().describe("熟练度, e.g. 母语/流利/熟练/基础"),
});
export type LanguageItem = z.infer<typeof languageItemSchema>;

// --- Interests ---
export const interestItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().describe("兴趣名称"),
  keywords: z.array(z.string()).optional(),
});
export type InterestItem = z.infer<typeof interestItemSchema>;

// --- References ---
export const referenceItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().describe("推荐人姓名"),
  reference: z.string().describe("推荐语/描述"),
});
export type ReferenceItem = z.infer<typeof referenceItemSchema>;

// --- JSON Resume 顶层 ---
export const jsonResumeSchema = z.object({
  basics: basicsSchema.optional(),
  work: z.array(workItemSchema).optional(),
  education: z.array(educationItemSchema).optional(),
  skills: z.array(skillItemSchema).optional(),
  projects: z.array(projectItemSchema).optional(),
  awards: z.array(awardItemSchema).optional(),
  certificates: z.array(certificateItemSchema).optional(),
  publications: z.array(publicationItemSchema).optional(),
  volunteer: z.array(volunteerItemSchema).optional(),
  languages: z.array(languageItemSchema).optional(),
  interests: z.array(interestItemSchema).optional(),
  references: z.array(referenceItemSchema).optional(),
});
export type ResumeData = z.infer<typeof jsonResumeSchema>;

// ============================================================
// 模板系统 Schema
// ============================================================

export const layoutTypeSchema = z.enum([
  "single-column",
  "two-column",
  "sidebar-left",
  "sidebar-right",
]);
export type LayoutType = z.infer<typeof layoutTypeSchema>;

export const colorTokensSchema = z.object({
  primary: z.string(),
  primaryLight: z.string(),
  primaryDark: z.string(),
  accent: z.string(),
  background: z.string(),
  surface: z.string(),
  textPrimary: z.string(),
  textSecondary: z.string(),
  textMuted: z.string(),
  border: z.string(),
  divider: z.string(),
});
export type ColorTokens = z.infer<typeof colorTokensSchema>;

export const typographyScaleSchema = z.object({
  h1: z.string().describe("姓名字号+行高, e.g. 'text-3xl leading-10 font-bold'"),
  h2: z.string().describe("章节标题"),
  h3: z.string().describe("子标题"),
  body: z.string().describe("正文"),
  small: z.string().describe("辅助文本"),
  caption: z.string().describe("说明文字"),
});
export type TypographyScale = z.infer<typeof typographyScaleSchema>;

export const typographySchema = z.object({
  fontFamily: z.enum(["sans", "serif", "kai", "mono"]),
  scale: typographyScaleSchema,
});
export type Typography = z.infer<typeof typographySchema>;

export const sectionVariantSchema = z.enum([
  "default",
  "compact",
  "timeline",
  "card",
  "tag-cloud",
  "progress-bar",
]);
export type SectionVariant = z.infer<typeof sectionVariantSchema>;

export const sectionConfigSchema = z.object({
  enabled: z.boolean(),
  order: z.number(),
  variant: sectionVariantSchema,
  title: z.string().optional(),
});
export type SectionConfig = z.infer<typeof sectionConfigSchema>;

export const templateConfigSchema = z.object({
  id: z.string(),
  name: z.string().describe("英文名"),
  nameZh: z.string().describe("中文名"),
  description: z.string().optional(),
  layout: layoutTypeSchema,
  colors: colorTokensSchema,
  typography: typographySchema,
  spacing: z.enum(["compact", "normal", "loose"]),
  sections: z.object({
    header: sectionConfigSchema,
    work: sectionConfigSchema,
    education: sectionConfigSchema,
    skills: sectionConfigSchema,
    projects: sectionConfigSchema,
    awards: sectionConfigSchema.optional(),
    certificates: sectionConfigSchema.optional(),
    publications: sectionConfigSchema.optional(),
    volunteer: sectionConfigSchema.optional(),
    languages: sectionConfigSchema.optional(),
    interests: sectionConfigSchema.optional(),
    references: sectionConfigSchema.optional(),
  }),
  headerLayout: z.enum(["centered", "split", "left-aligned"]),
  sectionDivider: z.enum(["line", "space", "none", "dot"]),
});
export type TemplateConfig = z.infer<typeof templateConfigSchema>;
export type HeaderLayout = z.infer<typeof templateConfigSchema.shape.headerLayout>;
export type SectionDivider = z.infer<typeof templateConfigSchema.shape.sectionDivider>;

// ============================================================
// 运行时 Resume 类型
// ============================================================

export const themeSchema = z.object({
  templateId: z.string(),
  colors: colorTokensSchema,
  typography: typographySchema,
  spacing: z.enum(["compact", "normal", "loose"]),
});
export type Theme = z.infer<typeof themeSchema>;

export const resumeSchema = z.object({
  id: z.string(),
  data: jsonResumeSchema,
  theme: themeSchema,
});
export type Resume = z.infer<typeof resumeSchema>;

// ============================================================
// 工厂函数
// ============================================================

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
}

/** minimal-professional 模板的默认主题快照（build 时内联，避免循环依赖） */
const MINIMAL_PROFESSIONAL_THEME: Omit<Theme, "templateId"> = {
  colors: {
    primary: "#1e293b",
    primaryLight: "#475569",
    primaryDark: "#0f172a",
    accent: "#2563eb",
    background: "#ffffff",
    surface: "#f8fafc",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#94a3b8",
    border: "#e2e8f0",
    divider: "#cbd5e1",
  },
  typography: {
    fontFamily: "sans",
    scale: {
      h1: "text-3xl/leading-10 font-bold",
      h2: "text-lg/leading-7 font-semibold tracking-wide",
      h3: "text-sm/leading-5 font-semibold",
      body: "text-sm/leading-6",
      small: "text-xs/leading-5",
      caption: "text-[10px]/leading-4",
    },
  },
  spacing: "normal" as const,
};

export function createDefaultTheme(): Theme {
  return { templateId: "minimal-professional", ...MINIMAL_PROFESSIONAL_THEME };
}

export function createEmptyResume(id = createId()): Resume {
  return {
    id,
    data: {},
    theme: createDefaultTheme(),
  };
}

// ============================================================
// Schema 演化与数据迁移
// ============================================================

/**
 * 检测简历数据格式版本。
 *
 * - 3: JSON Resume 格式 (data.basics 存在)
 * - 2: v2 modules 格式 (modules 数组 + skills categories)
 * - 1: v1 modules 格式 (modules 数组 + skills items)
 *
 * @param raw 原始简历数据
 * @returns 版本号，无法识别返回 0
 */
export function detectResumeVersion(raw: unknown): number {
  if (typeof raw !== "object" || raw === null) return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = raw as Record<string, unknown>;

  // v3: data 字段存在 + data.basics 存在
  if ("data" in obj && typeof obj.data === "object" && obj.data !== null) {
    const d = obj.data as Record<string, unknown>;
    if ("basics" in d && typeof d.basics === "object") return 3;
  }

  // v2: modules 数组 + skills categories
  if (obj.modules && Array.isArray(obj.modules)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skillsMod = (obj.modules as any[]).find((m: any) => m?.type === "skills");
    if (skillsMod && skillsMod.data && "categories" in skillsMod.data) {
      return 2;
    }
    if (skillsMod && skillsMod.data && "items" in skillsMod.data) {
      return 1;
    }
  }

  return 0;
}

// ============ v2 内部类型（仅迁移用，不导出） ============

const contactSchemaV2 = z.object({
  icon: z.string(),
  text: z.string(),
  link: z.string().optional(),
});

const headerDataSchemaV2 = z.object({
  name: z.string(),
  jobTitle: z.string(),
  contacts: z.array(contactSchemaV2),
});

const summaryDataSchemaV2 = z.object({
  text: z.string(),
});

const workExperienceItemSchemaV2 = z.object({
  company: z.string(),
  position: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  description: z.string(),
});

const workExperienceDataSchemaV2 = z.object({
  items: z.array(workExperienceItemSchemaV2),
});

const educationItemSchemaV2 = z.object({
  school: z.string(),
  degree: z.string(),
  major: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
});

const educationDataSchemaV2 = z.object({
  items: z.array(educationItemSchemaV2),
});

const skillsCategorySchemaV2 = z.object({
  name: z.string(),
  tags: z.array(z.string()),
});

const skillsDataSchemaV2 = z.object({
  categories: z.array(skillsCategorySchemaV2),
});

const projectItemSchemaV2 = z.object({
  name: z.string(),
  description: z.string(),
  techStack: z.array(z.string()),
  link: z.string().optional(),
});

const projectsDataSchemaV2 = z.object({
  items: z.array(projectItemSchemaV2),
});

const customDataSchemaV2 = z.object({
  title: z.string().optional(),
  content: z.string(),
});

const moduleBaseSchemaV2 = z.object({
  id: z.string(),
  order: z.number(),
  visible: z.boolean(),
});

const resumeModuleSchemaV2 = z.discriminatedUnion("type", [
  moduleBaseSchemaV2.extend({ type: z.literal("header"), data: headerDataSchemaV2 }),
  moduleBaseSchemaV2.extend({ type: z.literal("summary"), data: summaryDataSchemaV2 }),
  moduleBaseSchemaV2.extend({ type: z.literal("work-experience"), data: workExperienceDataSchemaV2 }),
  moduleBaseSchemaV2.extend({ type: z.literal("education"), data: educationDataSchemaV2 }),
  moduleBaseSchemaV2.extend({ type: z.literal("skills"), data: skillsDataSchemaV2 }),
  moduleBaseSchemaV2.extend({ type: z.literal("projects"), data: projectsDataSchemaV2 }),
  moduleBaseSchemaV2.extend({ type: z.literal("custom"), data: customDataSchemaV2 }),
]);

const themeSchemaV2 = z.object({
  templateId: z.string(),
  primaryColor: z.string(),
  fontFamily: z.enum(["sans", "serif", "kai"]),
  fontSize: z.enum(["small", "medium", "large"]),
  spacing: z.enum(["compact", "normal", "loose"]),
});

const resumeSchemaV2 = z.object({
  id: z.string(),
  modules: z.array(resumeModuleSchemaV2),
  theme: themeSchemaV2,
});

type ResumeV2 = z.infer<typeof resumeSchemaV2>;

// ============ v2 → v3 迁移 ============

/** 从旧 primaryColor 推导颜色 tokens 的默认值 */
function deriveColorTokens(primaryColor: string): ColorTokens {
  return {
    primary: primaryColor,
    primaryLight: primaryColor,
    primaryDark: "#0f172a",
    accent: primaryColor,
    background: "#ffffff",
    surface: "#f8fafc",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#94a3b8",
    border: "#e2e8f0",
    divider: "#cbd5e1",
  };
}

function deriveTypography(fontFamily: "sans" | "serif" | "kai", _fontSize: string): Typography {
  return {
    fontFamily: fontFamily as Typography["fontFamily"],
    scale: {
      h1: "text-3xl/leading-10 font-bold",
      h2: "text-lg/leading-7 font-semibold tracking-wide",
      h3: "text-sm/leading-5 font-semibold",
      body: "text-sm/leading-6",
      small: "text-xs/leading-5",
      caption: "text-[10px]/leading-4",
    },
  };
}

function extractContact(contacts: Array<{ icon: string; text: string; link?: string }>, icon: string): string | undefined {
  const c = contacts.find((c) => c.icon === icon);
  if (!c) return undefined;
  return c.link || c.text;
}

export function migrateV2ToV3(oldResume: ResumeV2): Resume {
  const { modules, theme: oldTheme } = oldResume;
  const data: ResumeData = {};

  for (const mod of modules) {
    switch (mod.type) {
      case "header": {
        const h = mod.data;
        data.basics = {
          name: h.name,
          label: h.jobTitle,
          email: extractContact(h.contacts, "email"),
          phone: extractContact(h.contacts, "phone"),
          url: extractContact(h.contacts, "link"),
          profiles: h.contacts
            .filter((c) => !["email", "phone", "link"].includes(c.icon))
            .map((c) => ({ network: c.icon, username: c.text, url: c.link })),
        };
        break;
      }
      case "summary": {
        if (!data.basics) data.basics = {};
        data.basics.summary = mod.data.text;
        break;
      }
      case "work-experience": {
        data.work = mod.data.items.map((item) => ({
          id: createId(),
          name: item.company,
          position: item.position,
          startDate: item.startDate,
          endDate: item.endDate,
          summary: item.description,
        }));
        break;
      }
      case "education": {
        data.education = mod.data.items.map((item) => ({
          id: createId(),
          institution: item.school,
          area: item.major,
          studyType: item.degree,
          startDate: item.startDate,
          endDate: item.endDate,
        }));
        break;
      }
      case "skills": {
        data.skills = mod.data.categories?.map((cat) => ({
          id: createId(),
          name: cat.name,
          keywords: cat.tags,
        }));
        break;
      }
      case "projects": {
        data.projects = mod.data.items.map((item) => ({
          id: createId(),
          name: item.name,
          description: item.description,
          keywords: item.techStack,
          url: item.link,
        }));
        break;
      }
      case "custom": {
        if (!data.publications) data.publications = [];
        data.publications.push({
          id: createId(),
          name: mod.data.title || "其他",
          summary: mod.data.content,
        });
        break;
      }
    }
  }

  return {
    id: oldResume.id,
    data,
    theme: {
      templateId: oldTheme.templateId,
      colors: deriveColorTokens(oldTheme.primaryColor),
      typography: deriveTypography(oldTheme.fontFamily, oldTheme.fontSize),
      spacing: oldTheme.spacing,
    },
  };
}

/**
 * 安全加载简历数据，支持多版本 Schema 兼容。
 *
 * - v3: 直接 parse
 * - v2: 迁移到 v3
 * - v1: 不支持
 *
 * @param raw 原始 JSON 数据
 * @returns 解析后的 Resume 对象
 * @throws 无法解析时抛出错误
 */
export function loadResume(raw: unknown): Resume {
  // v3: 尝试直接解析
  const v3Result = resumeSchema.safeParse(raw);
  if (v3Result.success) return v3Result.data;

  // v2: 尝试迁移
  const v2Result = resumeSchemaV2.safeParse(raw);
  if (v2Result.success) {
    console.log("检测到 v2 格式简历数据，自动迁移到 v3...");
    return migrateV2ToV3(v2Result.data);
  }

  // v1: 暂不支持
  const version = detectResumeVersion(raw);
  if (version === 1) {
    console.warn("检测到 v1 版本简历数据，尝试迁移...");
    throw new Error(
      "检测到 v1 格式的简历数据，当前版本尚不支持自动迁移。请在新版本中生成简历。",
    );
  }

  throw new Error(
    `无法解析简历数据: ${v3Result.error.message.slice(0, 200)}`,
  );
}

// ============================================================
// Agent Harness 事件类型
// ============================================================

export type HarnessEvent =
  | { type: "plan:start"; planId: string }
  | { type: "step:start"; stepId: string; description: string }
  | { type: "step:chunk"; stepId: string; text: string }
  | { type: "reasoning:chunk"; stepId: string; text: string }
  | { type: "step:done"; stepId: string; result: unknown }
  | {
      type: "step:tool_call";
      stepId: string;
      tool: string;
      args: unknown;
    }
  | { type: "plan:done"; resume: Resume }
  | { type: "plan:error"; stepId: string; error: string }
  | { type: "step:skipped"; stepId: string; reason: string }
  | { type: "step:retry"; stepId: string; attempt: number; error: string }
  | { type: "hook:block"; hookName: string; stepId?: string; reason: string };

// ============================================================
// Chat 类型
// ============================================================

/** 文件附件（上传简历/文档后解析出的文本内容） */
export interface FileAttachment {
  fileName: string;
  charCount: number;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  /** DeepSeek think mode 推理内容（仅 assistant 消息） */
  reasoningContent?: string;
  /** 文件附件（仅 user 消息，上传文件后附带解析文本） */
  attachments?: FileAttachment[];
}
