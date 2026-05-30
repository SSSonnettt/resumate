import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enablePatches, produceWithPatches, applyPatches, type Patch } from "immer";
import type { Resume, Module, Theme, ModuleType, ModuleData } from "@ai-resume/shared";

enablePatches();

const STORAGE_KEY = "ai-resume-data";

function loadFromStorage(): Resume | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(resume: Resume) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
}

function createEmptyResume(): Resume {
  return {
    id: crypto.randomUUID(),
    modules: [],
    theme: {
      templateId: "blue-simple",
      primaryColor: "#2563eb",
      fontFamily: "sans",
      fontSize: "medium",
      spacing: "normal",
    },
  };
}

interface ResumeState {
  resume: Resume;
  undoStack: Patch[][];
  redoStack: Patch[][];

  init: () => void;
  setTheme: (theme: Partial<Theme>) => void;
  addModule: (type: ModuleType) => void;
  removeModule: (moduleId: string) => void;
  reorderModules: (fromIndex: number, toIndex: number) => void;
  updateModuleData: (moduleId: string, data: Record<string, unknown>) => void;
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
      const saved = loadFromStorage();
      if (saved) {
        set((s) => {
          s.resume = saved;
        });
      } else {
        saveToStorage(get().resume);
      }
    },

    setTheme: (themePatch) => {
      const [next, _patches, inverse] = produceWithPatches(
        get().resume,
        (draft) => {
          Object.assign(draft.theme, themePatch);
        },
      );
      set((s) => {
        s.resume = next;
        s.undoStack.push(inverse);
        s.redoStack = [];
      });
      saveToStorage(next);
    },

    addModule: (type) => {
      const [next, _patches, inverse] = produceWithPatches(
        get().resume,
        (draft) => {
          const newModule: Module = {
            id: crypto.randomUUID(),
            type,
            order: draft.modules.length,
            visible: true,
            data: getDefaultData(type),
          };
          draft.modules.push(newModule);
        },
      );
      set((s) => {
        s.resume = next;
        s.undoStack.push(inverse);
        s.redoStack = [];
      });
      saveToStorage(next);
    },

    removeModule: (moduleId) => {
      const [next, _patches, inverse] = produceWithPatches(
        get().resume,
        (draft) => {
          draft.modules = draft.modules.filter((m) => m.id !== moduleId);
        },
      );
      set((s) => {
        s.resume = next;
        s.undoStack.push(inverse);
        s.redoStack = [];
      });
      saveToStorage(next);
    },

    reorderModules: (fromIndex, toIndex) => {
      const [next, _patches, inverse] = produceWithPatches(
        get().resume,
        (draft) => {
          const [moved] = draft.modules.splice(fromIndex, 1);
          draft.modules.splice(toIndex, 0, moved);
          draft.modules.forEach((m, i) => {
            m.order = i;
          });
        },
      );
      set((s) => {
        s.resume = next;
        s.undoStack.push(inverse);
        s.redoStack = [];
      });
      saveToStorage(next);
    },

    updateModuleData: (moduleId, dataPatch) => {
      const [next, _patches, inverse] = produceWithPatches(
        get().resume,
        (draft) => {
          const mod = draft.modules.find((m) => m.id === moduleId);
          if (mod) Object.assign(mod.data, dataPatch);
        },
      );
      set((s) => {
        s.resume = next;
        s.undoStack.push(inverse);
        s.redoStack = [];
      });
      saveToStorage(next);
    },

    undo: () => {
      const { undoStack, resume } = get();
      if (undoStack.length === 0) return;
      const inverse = undoStack[undoStack.length - 1];
      const prev = applyPatches(resume, inverse);
      set((s) => {
        s.resume = prev;
        s.undoStack = undoStack.slice(0, -1);
        s.redoStack.push(inverse);
      });
      saveToStorage(prev);
    },

    redo: () => {
      const { redoStack, resume } = get();
      if (redoStack.length === 0) return;
      const patch = redoStack[redoStack.length - 1];
      const next = applyPatches(resume, patch);
      set((s) => {
        s.resume = next;
        s.redoStack = redoStack.slice(0, -1);
        s.undoStack.push(patch);
      });
      saveToStorage(next);
    },

    applyAIResult: (aiResume) => {
      set((s) => {
        s.resume = aiResume;
        s.undoStack = [];
        s.redoStack = [];
      });
      saveToStorage(aiResume);
    },
  })),
);

function getDefaultData(type: ModuleType): ModuleData {
  switch (type) {
    case "header":
      return { name: "", jobTitle: "", contacts: [] };
    case "summary":
      return { text: "" };
    case "work-experience":
      return { items: [] };
    case "education":
      return { items: [] };
    case "skills":
      return { categories: [] };
    case "projects":
      return { items: [] };
    case "custom":
      return { title: "", content: "" };
  }
}
