"use client";
import { create } from "zustand";

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

interface WizardState {
  step: Step;
  completedSteps: Step[];
  checklist: ChecklistItem[];
  isGenerating: boolean;
  setStep: (step: Step) => void;
  goNext: () => void;
  goBack: () => void;
  markCollected: (key: string) => void;
  markSkipped: (key: string) => void;
  markGenerated: () => void;
  reset: () => void;
}

export const useWizardStore = create<WizardState>((set, get) => ({
  step: "chat",
  completedSteps: ["chat"],
  checklist: DEFAULT_CHECKLIST,
  isGenerating: false,

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
    set({ step, completedSteps: Array.from(newCompleted) });
  },

  goNext: () => {
    const { step } = get();
    const currentIdx = STEP_ORDER.indexOf(step);
    if (currentIdx < STEP_ORDER.length - 1) {
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
    set((state) => ({
      checklist: state.checklist.map((item) =>
        item.key === key ? { ...item, status: "collected" as const } : item,
      ),
    })),

  markSkipped: (key) =>
    set((state) => ({
      checklist: state.checklist.map((item) =>
        item.key === key ? { ...item, status: "skipped" as const } : item,
      ),
    })),

  markGenerated: () => set({ isGenerating: false }),

  reset: () =>
    set({
      step: "chat",
      completedSteps: ["chat"],
      checklist: DEFAULT_CHECKLIST,
      isGenerating: false,
    }),
}));

/** 获取步骤切换方向：正数=前进，负数=回退 */
export function getDirection(from: Step, to: Step): number {
  return STEP_ORDER.indexOf(to) - STEP_ORDER.indexOf(from);
}

export { STEP_ORDER, DEFAULT_CHECKLIST };
