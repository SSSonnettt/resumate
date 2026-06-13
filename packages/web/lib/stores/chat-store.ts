import { create } from "zustand";
import type { ChatMessage, HarnessEvent } from "@resumate/shared";

const MAX_EVENTS = 500;
const MAX_PERSISTED_MESSAGES = 100;

/** localStorage key — 遵循 AGENTS.md Rule 1，不可随意更改 */
export const CHAT_STORAGE_KEY = "resumate-chat";

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  harnessEvents: HarnessEvent[];

  addMessage: (msg: ChatMessage) => void;
  setStreaming: (v: boolean) => void;
  pushHarnessEvent: (evt: HarnessEvent) => void;
  clearHarnessEvents: () => void;
  hydrate: () => void;
  clearMessages: () => void;
}

/** 将消息列表写入 localStorage（仅最近 100 条） */
function persistMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    const toSave = messages.length > MAX_PERSISTED_MESSAGES
      ? messages.slice(-MAX_PERSISTED_MESSAGES)
      : messages;
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // quota exceeded — 静默失败
  }
}

/** 从 localStorage 读取消息列表 */
function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  harnessEvents: [],

  addMessage: (msg) =>
    set((s) => {
      const next = [...s.messages, msg];
      persistMessages(next);
      return { messages: next };
    }),

  setStreaming: (v) => set({ isStreaming: v }),

  pushHarnessEvent: (evt) =>
    set((s) => ({
      harnessEvents:
        s.harnessEvents.length >= MAX_EVENTS
          ? [...s.harnessEvents.slice(-MAX_EVENTS + 1), evt]
          : [...s.harnessEvents, evt],
    })),

  clearHarnessEvents: () => set({ harnessEvents: [] }),

  hydrate: () => {
    const saved = loadMessages();
    if (saved.length > 0) {
      set({ messages: saved });
    }
  },

  clearMessages: () => {
    set({ messages: [] });
    if (typeof window !== "undefined") {
      try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch { /* ignore */ }
    }
  },
}));
