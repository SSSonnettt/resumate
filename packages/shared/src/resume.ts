// 简历数据类型定义

export type ModuleType =
  | "header"
  | "summary"
  | "work-experience"
  | "education"
  | "skills"
  | "projects"
  | "custom";

export interface HeaderData {
  name: string;
  jobTitle: string;
  contacts: { icon: string; text: string; link?: string }[];
}

export interface SummaryData {
  text: string;
}

export interface WorkExperienceItem {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
}

export interface WorkExperienceData {
  items: WorkExperienceItem[];
}

export interface EducationItem {
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate?: string;
}

export interface EducationData {
  items: EducationItem[];
}

export interface SkillsCategory {
  name: string;
  tags: string[];
}

export interface SkillsData {
  categories: SkillsCategory[];
}

export interface ProjectItem {
  name: string;
  description: string;
  techStack: string[];
  link?: string;
}

export interface ProjectsData {
  items: ProjectItem[];
}

export interface CustomData {
  title?: string;
  content: string;
}

export type ModuleData =
  | HeaderData
  | SummaryData
  | WorkExperienceData
  | EducationData
  | SkillsData
  | ProjectsData
  | CustomData;

export interface Module {
  id: string;
  type: ModuleType;
  order: number;
  visible: boolean;
  data: ModuleData;
}

export interface Theme {
  templateId: string;
  primaryColor: string;
  fontFamily: "sans" | "serif" | "kai";
  fontSize: "small" | "medium" | "large";
  spacing: "compact" | "normal" | "loose";
}

export interface Resume {
  id: string;
  modules: Module[];
  theme: Theme;
}

export interface Template {
  id: string;
  name: string;
  defaults: Theme & {
    headerLayout: "centered" | "split";
    sectionDivider: "line" | "space" | "none";
  };
}

// Agent Harness 事件类型
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
