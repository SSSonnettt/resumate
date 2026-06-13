"use client";
import { create } from "zustand";
import type { ChatMessage, HarnessEvent } from "@resumate/shared";

export type Step = "chat" | "generating" | "editing" | "preview";

export interface ChecklistItem {
  key: string;
  label: string;
  status: "pending" | "collected" | "skipped";
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { key: "basic_info", label: "基本信息", status: "pending" },
  { key: "work_experience", label: "工作经历", status: "pending" },
  { key: "education", label: "教育背景", status: "pending" },
  { key: "skills", label: "技能标签", status: "pending" },
  { key: "projects", label: "项目经历", status: "pending" },
  { key: "self_evaluation", label: "自我评价", status: "pending" },
];

const STEP_ORDER: Step[] = ["chat", "generating", "editing", "preview"];

/** localStorage key — 遵循 AGENTS.md Rule 1，不可随意更改 */
export const WIZARD_STORAGE_KEY = "resumate-wizard";

/** 需持久化的 wizard state 字段 */
interface PersistedWizardState {
  step: Step;
  completedSteps: Step[];
  checklist: ChecklistItem[];
  generationCompleted: boolean;
  wizardMessages: ChatMessage[];
  wizardFileContents: string[];
}

interface WizardState extends PersistedWizardState {
  isGenerating: boolean;
  /** Wizard 专属对话消息（独立于全局 chat-store） */
  wizardMessages: ChatMessage[];
  /** Wizard 对话流式状态 */
  wizardStreaming: boolean;
  /** Wizard 专属 harnessEvents（生成管线） */
  wizardHarnessEvents: HarnessEvent[];
  /** 上传文件解析文本（用于生成步骤传递原始文件内容） */
  wizardFileContents: string[];

  setStep: (step: Step) => void;
  goNext: () => void;
  goBack: () => void;
  markCollected: (key: string) => void;
  markSkipped: (key: string) => void;
  markGenerated: () => void;
  markGenerationCompleted: () => void;
  /** Wizard 对话消息操作 */
  addWizardMessage: (msg: ChatMessage) => void;
  addWizardFileContents: (texts: string[]) => void;
  setWizardStreaming: (v: boolean) => void;
  pushWizardHarnessEvent: (evt: HarnessEvent) => void;
  clearWizardHarnessEvents: () => void;
  hydrate: () => void;
  reset: () => void;
}

/** 从 localStorage 恢复持久化状态 */
function loadPersistedState(): PersistedWizardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedWizardState;
  } catch {
    return null;
  }
}

/** 将可持久化字段写入 localStorage */
function persistWizardState(state: WizardState) {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedWizardState = {
      step: state.step,
      completedSteps: state.completedSteps,
      checklist: state.checklist,
      generationCompleted: state.generationCompleted,
      wizardMessages: state.wizardMessages,
      wizardFileContents: state.wizardFileContents,
    };
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota exceeded — 静默失败
  }
}

export const useWizardStore = create<WizardState>((set, get) => ({
  step: "chat",
  completedSteps: ["chat"],
  checklist: DEFAULT_CHECKLIST,
  isGenerating: false,
  generationCompleted: false,
  wizardMessages: [],
  wizardFileContents: [],
  wizardStreaming: false,
  wizardHarnessEvents: [],

  setStep: (step) => {
    const { completedSteps } = get();
    const currentIdx = STEP_ORDER.indexOf(get().step);
    const targetIdx = STEP_ORDER.indexOf(step);

    // 只允许跳转相邻步骤或已完成步骤
    if (
      !completedSteps.includes(step) &&
      Math.abs(targetIdx - currentIdx) !== 1
    ) {
      return;
    }

    const newCompleted = new Set(completedSteps);
    newCompleted.add(step);
    set((s) => {
      const next = { ...s, step, completedSteps: Array.from(newCompleted) };
      persistWizardState(next as WizardState);
      return { step, completedSteps: Array.from(newCompleted) };
    });
  },

  goNext: () => {
    const { step } = get();
    const currentIdx = STEP_ORDER.indexOf(step);
    if (currentIdx < STEP_ORDER.length - 1) {
      // 从聊天步骤进入生成步骤时，清除上一次的完成标记，确保重新触发管线
      if (step === "chat") {
        set({ generationCompleted: false });
      }
      get().setStep(STEP_ORDER[currentIdx + 1]);
    }
  },

  goBack: () => {
    const { step } = get();
    const currentIdx = STEP_ORDER.indexOf(step);
    if (currentIdx > 0) {
      get().setStep(STEP_ORDER[currentIdx - 1]);
    }
  },

  markCollected: (key) =>
    set((state) => {
      const next = {
        checklist: state.checklist.map((item) =>
          item.key === key ? { ...item, status: "collected" as const } : item,
        ),
      };
      persistWizardState({ ...state, ...next } as WizardState);
      return next;
    }),

  markSkipped: (key) =>
    set((state) => {
      const next = {
        checklist: state.checklist.map((item) =>
          item.key === key ? { ...item, status: "skipped" as const } : item,
        ),
      };
      persistWizardState({ ...state, ...next } as WizardState);
      return next;
    }),

  markGenerated: () =>
    set((state) => {
      persistWizardState({ ...state, isGenerating: false } as WizardState);
      return { isGenerating: false };
    }),

  markGenerationCompleted: () =>
    set((state) => {
      const next = { generationCompleted: true } as Partial<WizardState>;
      persistWizardState({ ...state, ...next } as WizardState);
      return next;
    }),

  addWizardMessage: (msg) =>
    set((s) => ({ wizardMessages: [...s.wizardMessages, msg] })),

  addWizardFileContents: (texts) =>
    set((s) => ({ wizardFileContents: [...s.wizardFileContents, ...texts] })),

  setWizardStreaming: (v) => set({ wizardStreaming: v }),

  pushWizardHarnessEvent: (evt) =>
    set((s) => ({ wizardHarnessEvents: [...s.wizardHarnessEvents, evt] })),

  clearWizardHarnessEvents: () => set({ wizardHarnessEvents: [] }),

  hydrate: () => {
    const saved = loadPersistedState();
    if (saved) {
      set({
        step: saved.step ?? "chat",
        completedSteps: saved.completedSteps ?? ["chat"],
        checklist: saved.checklist ?? DEFAULT_CHECKLIST,
        generationCompleted: saved.generationCompleted ?? false,
        wizardMessages: saved.wizardMessages ?? [],
        wizardFileContents: saved.wizardFileContents ?? [],
      });
    }
  },

  reset: () => {
    const next: Partial<WizardState> = {
      step: "chat" as Step,
      completedSteps: ["chat"] as Step[],
      checklist: DEFAULT_CHECKLIST,
      isGenerating: false,
      generationCompleted: false,
      wizardMessages: [],
      wizardFileContents: [],
      wizardHarnessEvents: [],
    };
    persistWizardState({ ...get(), ...next } as WizardState);
    set(next);
  },
}));

/** 获取步骤切换方向：正数=前进，负数=回退 */
export function getDirection(from: Step, to: Step): number {
  return STEP_ORDER.indexOf(to) - STEP_ORDER.indexOf(from);
}

export { STEP_ORDER, DEFAULT_CHECKLIST };
