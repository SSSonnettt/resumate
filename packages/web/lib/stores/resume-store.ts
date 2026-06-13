"use client";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  createEmptyResume,
  type Resume,
  type Theme,
} from "@resumate/shared";
import { templates, getTemplate } from "@/lib/templates";
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

interface ResumeState {
  resume: Resume;
  undoStack: ResumeHistoryEntry[];
  redoStack: ResumeHistoryEntry[];

  init: () => void;
  /** 微调当前模板的样式（颜色/字体/间距） */
  setTheme: (partial: Partial<Theme>) => void;
  /** 切换模板：覆盖 theme（colors/typography/spacing），不触碰 data */
  setTemplate: (templateId: string) => void;
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
      set((state) => {
        state.resume = resume;
      });
      persistResume(resume);
    },

    setTheme: (themePatch) => {
      commitAndPersist((draft) => {
        Object.assign(draft.theme, themePatch);
      });
    },

    setTemplate: (templateId) => {
      const template = getTemplate(templateId);
      if (!template) return;

      commitAndPersist((draft) => {
        draft.theme = {
          templateId: template.id,
          colors: { ...template.colors },
          typography: { ...template.typography },
          spacing: template.spacing,
        };
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
