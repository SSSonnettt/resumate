import { create } from "zustand";
import type { ChatMessage, HarnessEvent } from "@ai-resume/shared";

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  harnessEvents: HarnessEvent[];

  addMessage: (msg: ChatMessage) => void;
  setStreaming: (v: boolean) => void;
  pushHarnessEvent: (evt: HarnessEvent) => void;
  clearHarnessEvents: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  harnessEvents: [],

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  setStreaming: (v) => set({ isStreaming: v }),

  pushHarnessEvent: (evt) =>
    set((s) => ({ harnessEvents: [...s.harnessEvents, evt] })),

  clearHarnessEvents: () => set({ harnessEvents: [] }),
}));
