"use client";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  createDefaultModule,
  createEmptyResume,
  normalizeResumeOrder,
  type ModuleData,
  type ModuleType,
  type Resume,
  type Theme,
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

interface ResumeState {
  resume: Resume;
  undoStack: ResumeHistoryEntry[];
  redoStack: ResumeHistoryEntry[];

  init: () => void;
  setTheme: (theme: Partial<Theme>) => void;
  addModule: (type: ModuleType) => void;
  removeModule: (moduleId: string) => void;
  reorderModules: (fromIndex: number, toIndex: number) => void;
  updateModuleData: (moduleId: string, data: Partial<ModuleData>) => void;
  undo: () => void;
  redo: () => void;
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

    addModule: (type) => {
      commitAndPersist((draft) => {
        draft.modules.push(createDefaultModule(type, draft.modules.length));
      });
    },

    removeModule: (moduleId) => {
      commitAndPersist((draft) => {
        draft.modules = normalizeResumeOrder({
          ...draft,
          modules: draft.modules.filter((module) => module.id !== moduleId),
        }).modules;
      });
    },

    reorderModules: (fromIndex, toIndex) => {
      commitAndPersist((draft) => {
        const [moved] = draft.modules.splice(fromIndex, 1);
        if (!moved) return;
        draft.modules.splice(toIndex, 0, moved);
        draft.modules.forEach((module, index) => {
          module.order = index;
        });
      });
    },

    updateModuleData: (moduleId, dataPatch) => {
      commitAndPersist((draft) => {
        const module = draft.modules.find((item) => item.id === moduleId);
        if (module) {
          Object.assign(module.data, dataPatch);
        }
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
      const resume = normalizeResumeOrder(aiResume);
      set((state) => {
        state.resume = resume;
        state.undoStack = [];
        state.redoStack = [];
      });
      persistResume(resume);
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
