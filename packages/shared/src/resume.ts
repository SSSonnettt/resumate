import { z } from "zod";

export const moduleTypes = [
  "header",
  "summary",
  "work-experience",
  "education",
  "skills",
  "projects",
  "custom",
] as const;

export type ModuleType = (typeof moduleTypes)[number];

export const themeSchema = z.object({
  templateId: z.string(),
  primaryColor: z.string(),
  fontFamily: z.enum(["sans", "serif", "kai"]),
  fontSize: z.enum(["small", "medium", "large"]),
  spacing: z.enum(["compact", "normal", "loose"]),
});

export type Theme = z.infer<typeof themeSchema>;

export const contactSchema = z.object({
  icon: z.string(),
  text: z.string(),
  link: z.string().optional(),
});

export const headerDataSchema = z.object({
  name: z.string(),
  jobTitle: z.string(),
  contacts: z.array(contactSchema),
});

export const summaryDataSchema = z.object({
  text: z.string(),
});

export const workExperienceItemSchema = z.object({
  company: z.string(),
  position: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  description: z.string(),
});

export const workExperienceDataSchema = z.object({
  items: z.array(workExperienceItemSchema),
});

export const educationItemSchema = z.object({
  school: z.string(),
  degree: z.string(),
  major: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
});

export const educationDataSchema = z.object({
  items: z.array(educationItemSchema),
});

export const skillsCategorySchema = z.object({
  name: z.string(),
  tags: z.array(z.string()),
});

export const skillsDataSchema = z.object({
  categories: z.array(skillsCategorySchema),
});

export const projectItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  techStack: z.array(z.string()),
  link: z.string().optional(),
});

export const projectsDataSchema = z.object({
  items: z.array(projectItemSchema),
});

export const customDataSchema = z.object({
  title: z.string().optional(),
  content: z.string(),
});

const moduleBaseSchema = z.object({
  id: z.string(),
  order: z.number(),
  visible: z.boolean(),
});

export const headerModuleSchema = moduleBaseSchema.extend({
  type: z.literal("header"),
  data: headerDataSchema,
});

export const summaryModuleSchema = moduleBaseSchema.extend({
  type: z.literal("summary"),
  data: summaryDataSchema,
});

export const workExperienceModuleSchema = moduleBaseSchema.extend({
  type: z.literal("work-experience"),
  data: workExperienceDataSchema,
});

export const educationModuleSchema = moduleBaseSchema.extend({
  type: z.literal("education"),
  data: educationDataSchema,
});

export const skillsModuleSchema = moduleBaseSchema.extend({
  type: z.literal("skills"),
  data: skillsDataSchema,
});

export const projectsModuleSchema = moduleBaseSchema.extend({
  type: z.literal("projects"),
  data: projectsDataSchema,
});

export const customModuleSchema = moduleBaseSchema.extend({
  type: z.literal("custom"),
  data: customDataSchema,
});

export const resumeModuleSchema = z.discriminatedUnion("type", [
  headerModuleSchema,
  summaryModuleSchema,
  workExperienceModuleSchema,
  educationModuleSchema,
  skillsModuleSchema,
  projectsModuleSchema,
  customModuleSchema,
]);

export const resumeSchema = z.object({
  id: z.string(),
  modules: z.array(resumeModuleSchema),
  theme: themeSchema,
});

export type HeaderData = z.infer<typeof headerDataSchema>;
export type SummaryData = z.infer<typeof summaryDataSchema>;
export type WorkExperienceItem = z.infer<typeof workExperienceItemSchema>;
export type WorkExperienceData = z.infer<typeof workExperienceDataSchema>;
export type EducationItem = z.infer<typeof educationItemSchema>;
export type EducationData = z.infer<typeof educationDataSchema>;
export type SkillsCategory = z.infer<typeof skillsCategorySchema>;
export type SkillsData = z.infer<typeof skillsDataSchema>;
export type ProjectItem = z.infer<typeof projectItemSchema>;
export type ProjectsData = z.infer<typeof projectsDataSchema>;
export type CustomData = z.infer<typeof customDataSchema>;

export type ModuleData =
  | HeaderData
  | SummaryData
  | WorkExperienceData
  | EducationData
  | SkillsData
  | ProjectsData
  | CustomData;

export type ResumeModule = z.infer<typeof resumeModuleSchema>;
export type Module = ResumeModule;
export type Resume = z.infer<typeof resumeSchema>;

export interface Template {
  id: string;
  name: string;
  defaults: Theme & {
    headerLayout: "centered" | "split";
    sectionDivider: "line" | "space" | "none";
  };
}

export type HarnessEvent =
  | { type: "plan:start"; planId: string }
  | { type: "step:start"; stepId: string; description: string }
  | { type: "step:chunk"; stepId: string; text: string }
  | { type: "step:done"; stepId: string; result: unknown }
  | {
      type: "step:tool_call";
      stepId: string;
      tool: string;
      args: unknown;
    }
  | { type: "plan:done"; resume: Resume }
  | { type: "plan:error"; stepId: string; error: string };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export function createEmptyResume(id = createId()): Resume {
  return {
    id,
    modules: [],
    theme: createDefaultTheme(),
  };
}

export function createDefaultTheme(): Theme {
  return {
    templateId: "blue-simple",
    primaryColor: "#2563eb",
    fontFamily: "sans",
    fontSize: "medium",
    spacing: "normal",
  };
}

export function createDefaultModule(
  type: ModuleType,
  order = 0,
  id = createId(),
): ResumeModule {
  const base = { id, type, order, visible: true };

  switch (type) {
    case "header":
      return {
        ...base,
        type,
        data: {
          name: "",
          jobTitle: "",
          contacts: [],
        },
      };
    case "summary":
      return {
        ...base,
        type,
        data: {
          text: "",
        },
      };
    case "work-experience":
      return {
        ...base,
        type,
        data: {
          items: [],
        },
      };
    case "education":
      return {
        ...base,
        type,
        data: {
          items: [],
        },
      };
    case "skills":
      return {
        ...base,
        type,
        data: {
          categories: [],
        },
      };
    case "projects":
      return {
        ...base,
        type,
        data: {
          items: [],
        },
      };
    case "custom":
      return {
        ...base,
        type,
        data: {
          title: "",
          content: "",
        },
      };
  }
}

export function normalizeResumeOrder(resume: Resume): Resume {
  return {
    ...resume,
    modules: resume.modules
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((module, index) => ({
        ...module,
        order: index,
      })),
  };
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
}
