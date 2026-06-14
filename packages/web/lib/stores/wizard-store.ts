"use client";
import { create } from "zustand";
import type { ChatMessage, HarnessEvent } from "@resumate/shared";
import { useResumeStore } from "./resume-store";

export type Step = "chat" | "generating" | "editing";

export interface WizardConversation {
  id: string;
  /** 简历名称，从 resume.data.basics?.name 提取，未生成时为空 */
  name?: string;
  /** 该会话的消息列表（持久化时从 wizardMessages 同步） */
  messages: ChatMessage[];
  createdAt: number;
}

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

const STEP_ORDER: Step[] = ["chat", "generating", "editing"];

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
  conversations: WizardConversation[];
  activeConversationId: string;
}

/** 最大会话保留数量，防止 localStorage 膨胀 */
const MAX_CONVERSATIONS = 20;
/** 每会话最多保留的消息条数 */
const MAX_MESSAGES_PER_CONVERSATION = 100;

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
  /** 多会话管理 */
  conversations: WizardConversation[];
  activeConversationId: string;
  newConversation: () => void;
  switchConversation: (id: string) => void;
  setConversationName: (name: string) => void;
  deleteConversation: (id: string) => void;
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

/** 生成唯一 ID */
function createConversationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 将可持久化字段写入 localStorage，同步消息到会话并裁剪 */
function persistWizardState(state: WizardState) {
  if (typeof window === "undefined") return;

  // 将当前 wizardMessages 同步到活跃会话
  let conversations = state.conversations.map((c) => ({ ...c, messages: [...c.messages] }));
  if (state.activeConversationId) {
    conversations = conversations.map((c) => {
      if (c.id === state.activeConversationId) {
        return { ...c, messages: state.wizardMessages.slice(-MAX_MESSAGES_PER_CONVERSATION) };
      }
      return c;
    });
  }

  // 裁剪会话数量
  if (conversations.length > MAX_CONVERSATIONS) {
    conversations = conversations.slice(-MAX_CONVERSATIONS);
  }

  try {
    const payload: PersistedWizardState = {
      step: state.step,
      completedSteps: state.completedSteps,
      checklist: state.checklist,
      generationCompleted: state.generationCompleted,
      wizardMessages: state.wizardMessages,
      wizardFileContents: state.wizardFileContents,
      conversations,
      activeConversationId: state.activeConversationId,
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
  conversations: [],
  activeConversationId: "",

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
      // 旧数据迁移：如果没有 conversations 字段但有 wizardMessages，包装为单会话
      const conversations = saved.conversations && saved.conversations.length > 0
        ? saved.conversations
        : (saved.wizardMessages && saved.wizardMessages.length > 0)
          ? [{
              id: createConversationId(),
              name: undefined,
              messages: saved.wizardMessages.slice(-MAX_MESSAGES_PER_CONVERSATION),
              createdAt: saved.wizardMessages[0]?.timestamp ?? Date.now(),
            }]
          : [];
      const activeConversationId = saved.activeConversationId
        || (conversations.length > 0 ? conversations[conversations.length - 1]!.id : "");

      set({
        step: saved.step ?? "chat",
        completedSteps: saved.completedSteps ?? ["chat"],
        checklist: saved.checklist ?? DEFAULT_CHECKLIST,
        generationCompleted: saved.generationCompleted ?? false,
        wizardMessages: saved.wizardMessages ?? [],
        wizardFileContents: saved.wizardFileContents ?? [],
        conversations,
        activeConversationId,
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

  /** 新建会话：归档当前会话后重置状态 */
  newConversation: () => {
    const state = get();
    const newId = createConversationId();

    // 如果当前有消息，将活跃会话归档到 conversations
    let conversations = state.conversations.map((c) => ({ ...c, messages: [...c.messages] }));
    if (state.activeConversationId && state.wizardMessages.length > 0) {
      const existingIdx = conversations.findIndex((c) => c.id === state.activeConversationId);
      const updatedConv: WizardConversation = {
        id: state.activeConversationId,
        name: conversations.find((c) => c.id === state.activeConversationId)?.name,
        messages: state.wizardMessages.slice(-MAX_MESSAGES_PER_CONVERSATION),
        createdAt: conversations.find((c) => c.id === state.activeConversationId)?.createdAt ?? Date.now(),
      };
      if (existingIdx >= 0) {
        conversations[existingIdx] = updatedConv;
      } else {
        conversations.push(updatedConv);
      }
    }

    // 创建新会话条目
    conversations.push({
      id: newId,
      name: undefined,
      messages: [],
      createdAt: Date.now(),
    });

    // 裁剪会话数量
    if (conversations.length > MAX_CONVERSATIONS) {
      conversations = conversations.slice(-MAX_CONVERSATIONS);
    }

    const next: Partial<WizardState> = {
      step: "chat" as Step,
      completedSteps: ["chat"] as Step[],
      checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item, status: "pending" as const })),
      isGenerating: false,
      generationCompleted: false,
      wizardMessages: [],
      wizardFileContents: [],
      wizardHarnessEvents: [],
      conversations,
      activeConversationId: newId,
    };
    persistWizardState({ ...state, ...next } as WizardState);
    set(next);

    // 清空简历数据（新建会话从零开始）
    useResumeStore.getState().reset();
  },
  /** 切换会话：快照当前消息，加载目标会话 */
  switchConversation: (id: string) => {
    const state = get();
    if (id === state.activeConversationId) return;

    let conversations = state.conversations.map((c) => ({ ...c, messages: [...c.messages] }));

    // 将当前消息同步回旧会话
    if (state.activeConversationId) {
      conversations = conversations.map((c) => {
        if (c.id === state.activeConversationId) {
          return { ...c, messages: state.wizardMessages.slice(-MAX_MESSAGES_PER_CONVERSATION) };
        }
        return c;
      });
    }

    // 从目标会话加载消息
    const target = conversations.find((c) => c.id === id);
    const targetMessages = target?.messages ?? [];

    const next: Partial<WizardState> = {
      step: "chat" as Step,
      completedSteps: ["chat"] as Step[],
      checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item, status: "pending" as const })),
      isGenerating: false,
      generationCompleted: false,
      wizardMessages: targetMessages,
      wizardFileContents: [],
      wizardHarnessEvents: [],
      conversations,
      activeConversationId: id,
    };
    persistWizardState({ ...state, ...next } as WizardState);
    set(next);
  },

  /** 设置当前活跃会话的名称（AI 生成完成后调用） */
  setConversationName: (name: string) => {
    set((state) => {
      const conversations = state.conversations.map((c) => {
        if (c.id === state.activeConversationId) {
          return { ...c, name };
        }
        return c;
      });
      persistWizardState({ ...state, conversations } as WizardState);
      return { conversations };
    });
  },

  /** 删除会话 */
  deleteConversation: (id: string) => {
    const state = get();
    let conversations = state.conversations.filter((c) => c.id !== id);

    // 如果删除的是当前活跃会话
    if (id === state.activeConversationId) {
      if (conversations.length > 0) {
        // 切换到最近的一个会话
        const latest = conversations.reduce((a, b) =>
          a.createdAt > b.createdAt ? a : b,
        );
        const targetMessages = latest.messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
        const next: Partial<WizardState> = {
          step: "chat" as Step,
          completedSteps: ["chat"] as Step[],
          checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item, status: "pending" as const })),
          isGenerating: false,
          generationCompleted: false,
          wizardMessages: targetMessages,
          wizardFileContents: [],
          wizardHarnessEvents: [],
          conversations,
          activeConversationId: latest.id,
        };
        persistWizardState({ ...state, ...next } as WizardState);
        set(next);
      } else {
        // 没有剩余会话了，创建一个新的空会话
        const newId = createConversationId();
        conversations = [{
          id: newId,
          name: undefined,
          messages: [],
          createdAt: Date.now(),
        }];
        const next: Partial<WizardState> = {
          step: "chat" as Step,
          completedSteps: ["chat"] as Step[],
          checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item, status: "pending" as const })),
          isGenerating: false,
          generationCompleted: false,
          wizardMessages: [],
          wizardFileContents: [],
          wizardHarnessEvents: [],
          conversations,
          activeConversationId: newId,
        };
        persistWizardState({ ...state, ...next } as WizardState);
        set(next);
      }
    } else {
      // 删除的不是活跃会话，仅移除
      set((s) => {
        persistWizardState({ ...s, conversations } as WizardState);
        return { conversations };
      });
    }
  },
}));

/** 获取步骤切换方向：正数=前进，负数=回退 */
export function getDirection(from: Step, to: Step): number {
  return STEP_ORDER.indexOf(to) - STEP_ORDER.indexOf(from);
}

export { STEP_ORDER, DEFAULT_CHECKLIST };
