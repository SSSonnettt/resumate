"use client";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  createEmptyResume,
  type Resume,
  type ResumeData,
} from "@resumate/shared";
import {
  commitResumeMutation,
  redoResumeMutation,
  undoResumeMutation,
  type ResumeHistoryEntry,
} from "@/lib/resume/history";
import {
  getInitialResume,
  saveResumeToStorage,
} from "@/lib/resume/storage";

/** Mock 数据——用于验证主题渲染流水线，后续接入 AI 生成流程后移除 */
const MOCK_RESUME_DATA: ResumeData = {
  basics: {
    name: "张三",
    label: "高级前端工程师",
    email: "zhangsan@example.com",
    phone: "13800138000",
    url: "https://zhangsan.dev",
    summary: "8 年前端开发经验，专注 React 生态和性能优化，主导过多款亿级用户产品的架构设计。",
    location: { city: "北京", countryCode: "CN" },
    profiles: [
      { network: "GitHub", username: "zhangsan", url: "https://github.com/zhangsan" },
      { network: "LinkedIn", username: "zhangsan", url: "https://linkedin.com/in/zhangsan" },
    ],
  },
  work: [
    {
      name: "字节跳动",
      position: "高级前端工程师",
      startDate: "2021-03",
      endDate: "2026-01",
      summary: "负责抖音电商中台前端架构设计与核心模块开发",
      highlights: [
        "主导微前端架构落地，将 12 个子应用集成到统一平台",
        "优化首屏加载性能，LCP 从 3.2s 降至 1.1s",
      ],
    },
    {
      name: "阿里巴巴",
      position: "前端开发工程师",
      startDate: "2018-07",
      endDate: "2021-02",
      summary: "参与淘宝商家后台系统前端开发",
      highlights: [
        "重构订单管理模块，代码量减少 40%",
        "建立组件库，覆盖 50+ 业务组件",
      ],
    },
  ],
  education: [
    {
      institution: "清华大学",
      area: "软件工程",
      studyType: "硕士",
      startDate: "2015-09",
      endDate: "2018-07",
    },
  ],
  skills: [
    { name: "前端", keywords: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Webpack", "Vite"] },
    { name: "后端", keywords: ["Node.js", "GraphQL", "PostgreSQL", "Redis"] },
    { name: "工具", keywords: ["Git", "Docker", "CI/CD", "Figma", "Webpack"] },
  ],
  projects: [
    {
      name: "微前端框架",
      description: "自研轻量级微前端框架，支持 JS 沙箱隔离和 CSS Scope",
      keywords: ["React", "TypeScript", "qiankun", "Webpack 5"],
      url: "https://github.com/zhangsan/micro-fe",
    },
  ],
  languages: [
    { language: "中文", fluency: "母语" },
    { language: "英语", fluency: "流利" },
  ],
};

interface ResumeState {
  resume: Resume;
  undoStack: ResumeHistoryEntry[];
  redoStack: ResumeHistoryEntry[];

  init: () => void;
  /** 新建会话时重置为空简历 */
  reset: () => void;
  /** 切换社区主题 slug */
  setThemeSlug: (slug: string) => void;
  /** 直接更新 resume.data 中的某个路径 */
  updateData: (recipe: (draft: Resume["data"]) => void) => void;
  undo: () => void;
  redo: () => void;
  /** AI 生成完成后替换整个 resume */
  applyAIResult: (resume: Resume) => void;
}

export const useResumeStore = create<ResumeState>()(
  immer((set, get) => ({
    resume: createEmptyResume(),
    undoStack: [],
    redoStack: [],

    init: () => {
      const resume = getInitialResume(
        typeof window === "undefined" ? undefined : window.localStorage,
      );
      // 如果没有保存数据，注入 mock 数据用于验证主题渲染
      if (!resume.data.basics && !resume.data.work?.length && !resume.data.education?.length) {
        resume.data = MOCK_RESUME_DATA;
        resume.themeSlug = "flat";
      }
      set((state) => {
        state.resume = resume;
      });
      persistResume(resume);
    },

    reset: () => {
      const empty = createEmptyResume();
      set((state) => {
        state.resume = empty;
        state.undoStack = [];
        state.redoStack = [];
      });
      persistResume(empty);
    },

    setThemeSlug: (slug) => {
      commitAndPersist((draft) => {
        draft.themeSlug = slug;
      });
    },

    updateData: (recipe) => {
      commitAndPersist((draft) => {
        recipe(draft.data);
      });
    },

    undo: () => {
      const next = undoResumeMutation(get());
      set((state) => {
        state.resume = next.resume;
        state.undoStack = next.undoStack;
        state.redoStack = next.redoStack;
      });
      persistResume(next.resume);
    },

    redo: () => {
      const next = redoResumeMutation(get());
      set((state) => {
        state.resume = next.resume;
        state.undoStack = next.undoStack;
        state.redoStack = next.redoStack;
      });
      persistResume(next.resume);
    },

    applyAIResult: (aiResume) => {
      set((state) => {
        state.resume = aiResume;
        state.undoStack = [];
        state.redoStack = [];
      });
      persistResume(aiResume);
    },
  })),
);

function commitAndPersist(recipe: Parameters<typeof commitResumeMutation>[1]) {
  const state = useResumeStore.getState();
  const next = commitResumeMutation(state, recipe);
  useResumeStore.setState({
    resume: next.resume,
    undoStack: next.undoStack,
    redoStack: next.redoStack,
  });
  persistResume(next.resume);
}

function persistResume(resume: Resume): void {
  if (typeof window === "undefined") return;
  saveResumeToStorage(window.localStorage, resume);
}
