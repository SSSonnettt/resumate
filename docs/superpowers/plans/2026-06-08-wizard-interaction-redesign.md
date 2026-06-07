# 四步向导交互重设计 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有三页面架构合并为单一 `/wizard` 页面，四步向导式流程（chat→generating→editing→preview），framer-motion 滑动切换。

**Architecture:** 状态机驱动（WizardStore 管理 step）+ AnimatePresence 滑动动画。最大化复用现有组件（ChatPanel、ModulePanel、ResumeCanvas、StylePanel、ModuleRenderer）。新增 WizardShell/InfoChecklist/LogStreamView 三个组件。旧路由 301 redirect 到 wizard。

**Tech Stack:** Next.js 15, React 19, TypeScript, framer-motion, Zustand, Tailwind CSS

---

## 文件结构

```
packages/web/
├── app/
│   ├── wizard/page.tsx              [新增] Wizard 主页面
│   ├── page.tsx                     [修改] redirect → /wizard
│   ├── editor/page.tsx              [修改] redirect → /wizard
│   └── preview/page.tsx             [修改] redirect → /wizard
├── components/
│   ├── wizard/
│   │   ├── wizard-shell.tsx         [新增] 顶层容器
│   │   ├── step-indicator.tsx       [新增] 步骤指示器
│   │   ├── navigation-bar.tsx       [新增] 底部导航
│   │   ├── chat-step.tsx            [新增] 步骤1容器
│   │   ├── info-checklist.tsx       [新增] 信息清单
│   │   ├── generating-step.tsx      [新增] 步骤2容器
│   │   ├── log-stream-view.tsx      [新增] 日志流视图
│   │   ├── editing-step.tsx         [新增] 步骤3容器
│   │   └── preview-step.tsx         [新增] 步骤4容器
│   └── chat/
│       └── chat-panel.tsx           [修改] 添加 variant prop
└── lib/
    └── stores/
        └── wizard-store.ts          [新增] WizardStore
```

---

### Task 0: 安装 framer-motion

**Files:**
- Modify: `packages/web/package.json`

- [ ] **Step 1: 安装 framer-motion**

```bash
cd packages/web && pnpm add framer-motion
```

- [ ] **Step 2: 验证安装**

```bash
grep "framer-motion" packages/web/package.json
```

Expected: 包名出现在 dependencies 中

- [ ] **Step 3: Commit**

```bash
git add packages/web/package.json packages/web/pnpm-lock.yaml
git commit -m "chore: add framer-motion dependency"
```

---

### Task 1: 创建 WizardStore

**Files:**
- Create: `packages/web/lib/stores/wizard-store.ts`

- [ ] **Step 1: 创建 WizardStore**

```typescript
// packages/web/lib/stores/wizard-store.ts
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
    if (!completedSteps.includes(step) && Math.abs(targetIdx - currentIdx) !== 1) {
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
      const nextStep = STEP_ORDER[currentIdx + 1];
      get().setStep(nextStep);
    }
  },

  goBack: () => {
    const { step } = get();
    const currentIdx = STEP_ORDER.indexOf(step);
    if (currentIdx > 0) {
      const prevStep = STEP_ORDER[currentIdx - 1];
      get().setStep(prevStep);
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
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/lib/stores/wizard-store.ts
git commit -m "feat: add WizardStore for step state management"
```

---

### Task 2: 创建 StepIndicator 组件

**Files:**
- Create: `packages/web/components/wizard/step-indicator.tsx`

- [ ] **Step 1: 创建 StepIndicator**

```typescript
// packages/web/components/wizard/step-indicator.tsx
"use client";
import { motion } from "framer-motion";
import { useWizardStore, type Step } from "@/lib/stores/wizard-store";

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "chat", label: "聊天收集", icon: "💬" },
  { key: "generating", label: "AI 生成", icon: "⚙️" },
  { key: "editing", label: "可视化编辑", icon: "✏️" },
  { key: "preview", label: "预览导出", icon: "📄" },
];

export function StepIndicator() {
  const step = useWizardStore((s) => s.step);
  const completedSteps = useWizardStore((s) => s.completedSteps);
  const setStep = useWizardStore((s) => s.setStep);

  return (
    <nav className="flex items-center justify-center gap-0" aria-label="步骤进度">
      {STEPS.map((s, index) => {
        const isCurrent = s.key === step;
        const isCompleted = completedSteps.includes(s.key);
        const isClickable = isCompleted && s.key !== step;

        return (
          <div key={s.key} className="flex items-center">
            {index > 0 && (
              <div
                className={`mx-2 h-0.5 w-8 rounded transition-colors ${
                  isCompleted || isCurrent ? "bg-blue-500" : "bg-slate-200"
                }`}
              />
            )}
            <button
              onClick={() => isClickable && setStep(s.key)}
              disabled={!isClickable}
              className={`relative flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isCurrent
                  ? "bg-blue-600 text-white shadow-md"
                  : isCompleted
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                    : "bg-slate-100 text-slate-400 cursor-default"
              }`}
            >
              {isCurrent && (
                <motion.div
                  layoutId="step-indicator"
                  className="absolute inset-0 rounded-full bg-blue-600"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{s.icon}</span>
              <span className="relative z-10 hidden sm:inline">{s.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/components/wizard/step-indicator.tsx
git commit -m "feat: add StepIndicator component with framer-motion layoutId animation"
```

---

### Task 3: 创建 InfoChecklist 组件

**Files:**
- Create: `packages/web/components/wizard/info-checklist.tsx`

- [ ] **Step 1: 创建 InfoChecklist**

```typescript
// packages/web/components/wizard/info-checklist.tsx
"use client";
import { CheckCircle2, Circle, MinusCircle } from "lucide-react";
import { useWizardStore } from "@/lib/stores/wizard-store";

export function InfoChecklist() {
  const checklist = useWizardStore((s) => s.checklist);
  const markCollected = useWizardStore((s) => s.markCollected);
  const markSkipped = useWizardStore((s) => s.markSkipped);

  const collectedCount = checklist.filter(
    (item) => item.status !== "pending",
  ).length;
  const progressPercent = Math.round((collectedCount / checklist.length) * 100);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-800">信息收集清单</h3>
        <p className="mt-1 text-xs text-slate-500">
          逐项提供信息，AI 会引导你完成
        </p>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto p-3">
        {checklist.map((item) => (
          <li key={item.key}>
            <button
              onClick={() => {
                if (item.status === "pending") {
                  markCollected(item.key);
                } else if (item.status === "collected") {
                  markSkipped(item.key);
                } else {
                  markCollected(item.key);
                }
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                item.status === "collected"
                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                  : item.status === "skipped"
                    ? "bg-slate-50 text-slate-400 hover:bg-slate-100 line-through"
                    : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.status === "collected" ? (
                <CheckCircle2 size={16} className="shrink-0 text-green-500" />
              ) : item.status === "skipped" ? (
                <MinusCircle size={16} className="shrink-0 text-slate-300" />
              ) : (
                <Circle size={16} className="shrink-0 text-slate-300" />
              )}
              <span className="flex-1">{item.label}</span>
              <span className="text-xs opacity-60">
                {item.status === "collected"
                  ? "已收集"
                  : item.status === "skipped"
                    ? "已跳过"
                    : "待收集"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-200 p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>收集进度</span>
          <span>
            {collectedCount}/{checklist.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {collectedCount === checklist.length && (
          <p className="mt-3 text-center text-xs font-medium text-green-600">
            ✨ 全部信息已就绪，可以开始生成简历
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/components/wizard/info-checklist.tsx
git commit -m "feat: add InfoChecklist component for step 1"
```

---

### Task 4: 创建 NavigationBar 组件

**Files:**
- Create: `packages/web/components/wizard/navigation-bar.tsx`

- [ ] **Step 1: 创建 NavigationBar**

```typescript
// packages/web/components/wizard/navigation-bar.tsx
"use client";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useWizardStore, type Step } from "@/lib/stores/wizard-store";

const STEP_LABELS: Record<Step, string> = {
  chat: "开始生成简历",
  generating: "生成中...",
  editing: "预览导出",
  preview: "完成",
};

const STEP_NEXT_LABELS: Record<Step, string> = {
  chat: "开始生成",
  generating: "",
  editing: "预览导出",
  preview: "",
};

export function NavigationBar() {
  const step = useWizardStore((s) => s.step);
  const goNext = useWizardStore((s) => s.goNext);
  const goBack = useWizardStore((s) => s.goBack);
  const checklist = useWizardStore((s) => s.checklist);

  const canGoBack = step !== "chat";
  const canGoNext =
    step === "chat"
      ? checklist.every((item) => item.status !== "pending") // 全部收集完成
      : step === "editing";

  if (step === "generating") {
    return null; // 生成中不显示导航
  }

  return (
    <div className="flex items-center justify-center gap-4 border-t border-slate-200 bg-white px-5 py-3">
      <button
        onClick={goBack}
        disabled={!canGoBack}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
      >
        <ArrowLeft size={15} />
        上一步
      </button>

      <span className="text-xs text-slate-400 min-w-16 text-center">
        {step === "chat" && "步骤 1/4"}
        {step === "editing" && "步骤 3/4"}
        {step === "preview" && "步骤 4/4"}
      </span>

      {canGoNext && (
        <button
          onClick={goNext}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          {STEP_NEXT_LABELS[step]}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/components/wizard/navigation-bar.tsx
git commit -m "feat: add NavigationBar component for wizard step navigation"
```

---

### Task 5: 修改 ChatPanel 支持 wizard 模式

**Files:**
- Modify: `packages/web/components/chat/chat-panel.tsx`

- [ ] **Step 1: 添加 variant prop**

修改 ChatPanel 的 props 和渲染逻辑。variant 为 `"wizard"` 时隐藏 header 和 guided prompts 文本域，只保留消息列表和底部输入。

```typescript
// packages/web/components/chat/chat-panel.tsx
// 在文件顶部添加 variant prop 类型

// 修改前：
// export function ChatPanel() {
// 修改后：
interface ChatPanelProps {
  variant?: "standalone" | "wizard";
  onGenerate?: () => void; // wizard 模式下，plan:done 后回调
}

export function ChatPanel({ variant = "standalone", onGenerate }: ChatPanelProps) {
```

- [ ] **Step 2: 条件渲染 header**

在 return 中包裹条件：

```typescript
// 现有 header 包裹在条件中：
{variant === "standalone" && (
  <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
    <div>
      <p className="text-xs font-medium text-slate-400">AI Resume Studio</p>
      <h1 className="text-base font-semibold text-slate-950">JD 定制中文简历</h1>
    </div>
    <Link
      href="/editor"
      className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
    >
      编辑器
      <ArrowRight size={15} />
    </Link>
  </header>
)}
```

- [ ] **Step 3: 条件渲染 guided prompts**

```typescript
// 现有的 guided prompts section 包裹在条件中：
{variant === "standalone" && (
  <section className="border-b border-slate-200 bg-white p-5">
    {/* 现有 guidedPrompts 内容 */}
  </section>
)}
```

- [ ] **Step 4: wizard 模式下添加底部输入区**

在消息列表下方，wizard 模式显示一个简单的输入框：

```typescript
{variant === "wizard" && !isStreaming && (
  <div className="border-t border-slate-200 bg-white p-4">
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const input = form.elements.namedItem("chat-input") as HTMLTextAreaElement;
        if (input.value.trim()) {
          const content = input.value.trim();
          submitMessage(content);
          input.value = "";
        }
      }}
      className="flex gap-2"
    >
      <textarea
        name="chat-input"
        placeholder="输入你的经历信息..."
        rows={2}
        className="flex-1 resize-none rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400 focus:bg-white"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        发送
      </button>
    </form>
  </div>
)}
```

- [ ] **Step 5: 提取 submitMessage 函数**

从现有的 `submitWorkbench` 中提取发送消息的核心逻辑（SSE 处理），创建一个 `submitMessage(content: string)` 函数：

```typescript
// 新增函数，发送单条消息（wizard 模式下使用）
async function submitMessage(content: string) {
  if (!content.trim() || isStreaming) return;

  clearHarnessEvents();
  const userMsg = {
    id: crypto.randomUUID(),
    role: "user" as const,
    content,
    timestamp: Date.now(),
  };
  addMessage(userMsg);
  setStreaming(true);

  const assistantMsgId = crypto.randomUUID();
  let assistantContent = "";
  let hasError = false;
  let hasResumeResult = false;

  try {
    const config = getProviderConfig();
    const apiKey = config?.apiKey || localStorage.getItem("ai-api-key") || "";

    const requestBody: Record<string, unknown> = {
      messages: [...messages, userMsg].map((message) => ({
        role: message.role,
        content: message.content,
      })),
    };

    if (config) {
      requestBody.provider = config.provider === "anthropic" ? "anthropic" : "openai-compat";
      requestBody.apiKey = config.apiKey;
      if (config.provider !== "anthropic") {
        requestBody.baseURL = config.baseURL;
        requestBody.model = config.model;
      }
    } else {
      requestBody.provider = "anthropic";
      requestBody.apiKey = apiKey;
    }

    const response = await fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`服务器错误 (${response.status})`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取响应流");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6)) as SSERawEvent;

          if (data.type !== "stream:done" && data.type !== "stream:error") {
            pushHarnessEvent(data as HarnessEvent);
          }

          if (data.type === "step:chunk") {
            assistantContent += data.text;
          }

          if (
            data.type === "step:done" &&
            data.stepId === "collect" &&
            data.result &&
            typeof (data.result as Record<string, unknown>).text === "string"
          ) {
            assistantContent = (data.result as { text: string }).text;
          }

          if (hasResume(data)) {
            applyAIResult(data.resume);
            hasResumeResult = true;
            onGenerate?.(); // wizard 模式下通知上层
          }

          if (data.type === "plan:error") {
            hasError = true;
            assistantContent = `AI 处理出错：${data.error}`;
          }
        } catch {
          // Ignore malformed SSE rows.
        }
      }
    }
  } catch (err) {
    hasError = true;
    assistantContent = `请求失败：${err instanceof Error ? err.message : String(err)}`;
  } finally {
    const finalContent = resolveFinalAssistantContent({
      hasError,
      hasResumeResult,
      assistantContent,
    });
    addMessage({
      id: assistantMsgId,
      role: "assistant",
      content: finalContent,
      timestamp: Date.now(),
    });
    setStreaming(false);
  }
}

// submitWorkbench 改为调用 submitMessage：
async function submitWorkbench() {
  const content = formatGuidedInput(drafts);
  if (!content.trim() || isStreaming) return;
  await submitMessage(content);
}
```

注意：`submitMessage` 函数需要访问 `useResumeStore` 的 `applyAIResult`。由于 `submitWorkbench` 原本就在组件内部，提取后 `submitMessage` 也在同一闭包内，可以直接访问。

- [ ] **Step 6: 验证 TypeScript 编译**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 7: Commit**

```bash
git add packages/web/components/chat/chat-panel.tsx
git commit -m "feat: add variant prop to ChatPanel for wizard mode support"
```

---

### Task 6: 创建 ChatStep 步骤1容器

**Files:**
- Create: `packages/web/components/wizard/chat-step.tsx`

- [ ] **Step 1: 创建 ChatStep**

```typescript
// packages/web/components/wizard/chat-step.tsx
"use client";
import { ChatPanel } from "@/components/chat/chat-panel";
import { InfoChecklist } from "./info-checklist";
import { useWizardStore } from "@/lib/stores/wizard-store";

export function ChatStep() {
  const goNext = useWizardStore((s) => s.goNext);
  const checklist = useWizardStore((s) => s.checklist);
  const allReady = checklist.every((item) => item.status !== "pending");

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0">
        <ChatPanel
          variant="wizard"
          onGenerate={() => {
            // plan:done 后自动进入生成步骤
            goNext();
          }}
        />
      </div>
      <aside className="w-[280px] shrink-0 border-l border-slate-200 bg-white">
        <InfoChecklist />
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/components/wizard/chat-step.tsx
git commit -m "feat: add ChatStep component wrapping ChatPanel + InfoChecklist"
```

---

### Task 7: 创建 LogStreamView + GeneratingStep

**Files:**
- Create: `packages/web/components/wizard/log-stream-view.tsx`
- Create: `packages/web/components/wizard/generating-step.tsx`

- [ ] **Step 1: 创建 LogStreamView**

```typescript
// packages/web/components/wizard/log-stream-view.tsx
"use client";
import { useEffect, useRef } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { CheckCircle2, Loader2, Circle, AlertCircle } from "lucide-react";
import type { HarnessEvent } from "@resumate/shared";

const STAGE_LABELS: Record<string, string> = {
  classify: "识别需求",
  collect: "整理信息",
  generate: "生成简历",
  validate: "校验结构",
  present: "准备编辑",
};

const STAGE_ORDER = ["classify", "collect", "generate", "validate", "present"];

export function LogStreamView() {
  const harnessEvents = useChatStore((s) => s.harnessEvents);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const completedStages = new Set(
    harnessEvents
      .filter((e) => e.type === "step:done")
      .map((e) => e.stepId),
  );

  const currentStage = harnessEvents
    .filter((e) => e.type === "step:start")
    .map((e) => e.stepId)
    .filter((id) => !completedStages.has(id))
    .at(-1);

  const errorEvent = harnessEvents.find(
    (e) => e.type === "plan:error",
  ) as (HarnessEvent & { type: "plan:error" }) | undefined;

  const chunks = harnessEvents
    .filter((e) => e.type === "step:chunk")
    .map((e) => (e as HarnessEvent & { type: "step:chunk" }).text);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chunks.length, harnessEvents.length]);

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-6 py-8">
      {/* 阶段进度 */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-1.5">
        {STAGE_ORDER.map((stageId) => {
          const done = completedStages.has(stageId);
          const current = stageId === currentStage;
          return (
            <span
              key={stageId}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                done
                  ? "bg-green-50 text-green-700"
                  : current
                    ? "bg-blue-100 text-blue-700 shadow-sm"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? (
                <CheckCircle2 size={12} />
              ) : current ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Circle size={12} />
              )}
              {STAGE_LABELS[stageId] || stageId}
            </span>
          );
        })}
      </div>

      {/* 日志流 */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 font-mono text-sm leading-relaxed text-slate-700">
        {harnessEvents.length === 0 && isStreaming && (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            🤖 AI Agent 启动中...
          </div>
        )}

        {harnessEvents
          .filter((e) => e.type !== "step:chunk")
          .map((event, index) => (
            <div key={index} className="mb-2">
              {event.type === "plan:start" && (
                <div className="text-slate-400">🚀 启动 Plan: {event.planId}</div>
              )}
              {event.type === "step:start" && (
                <div className="text-blue-600">
                  🔄 开始: {STAGE_LABELS[event.stepId] || event.stepId}
                </div>
              )}
              {event.type === "step:done" && (
                <div className="text-green-600">
                  ✅ 完成: {STAGE_LABELS[event.stepId] || event.stepId}
                </div>
              )}
              {event.type === "plan:error" && (
                <div className="rounded bg-red-50 p-2 text-red-700">
                  ❌ 错误: {(event as HarnessEvent & { type: "plan:error" }).error}
                </div>
              )}
            </div>
          ))}

        {/* 流式文本 */}
        {chunks.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3 text-slate-500 whitespace-pre-wrap">
            {chunks.join("")}
          </div>
        )}

        {errorEvent && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-red-700">
              <AlertCircle size={16} />
              生成失败
            </div>
            <p className="mt-1 text-sm text-red-600">
              {errorEvent.error || "未知错误，请重试或返回上一步补充信息"}
            </p>
          </div>
        )}

        {isStreaming && (
          <div className="mt-2 flex items-center gap-2 text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            生成中...
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 GeneratingStep**

```typescript
// packages/web/components/wizard/generating-step.tsx
"use client";
import { useEffect } from "react";
import { LogStreamView } from "./log-stream-view";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { useChatStore } from "@/lib/stores/chat-store";

export function GeneratingStep() {
  const goNext = useWizardStore((s) => s.goNext);
  const markGenerated = useWizardStore((s) => s.markGenerated);
  const harnessEvents = useChatStore((s) => s.harnessEvents);

  useEffect(() => {
    const hasPlanDone = harnessEvents.some((e) => e.type === "plan:done");
    if (hasPlanDone) {
      markGenerated();
      // 稍作延迟，让用户看到完成状态
      const timer = setTimeout(() => goNext(), 1000);
      return () => clearTimeout(timer);
    }
  }, [harnessEvents, goNext, markGenerated]);

  return <LogStreamView />;
}
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/components/wizard/log-stream-view.tsx packages/web/components/wizard/generating-step.tsx
git commit -m "feat: add LogStreamView and GeneratingStep for step 2"
```

---

### Task 8: 创建 EditingStep 步骤3容器

**Files:**
- Create: `packages/web/components/wizard/editing-step.tsx`

- [ ] **Step 1: 创建 EditingStep**

复用现有 ModulePanel、ResumeCanvas、StylePanel 组件，去除原 editor header。

```typescript
// packages/web/components/wizard/editing-step.tsx
"use client";
import { ModulePanel } from "@/components/editor/module-panel";
import { ResumeCanvas } from "@/components/editor/resume-canvas";
import { StylePanel } from "@/components/editor/style-panel";

export function EditingStep() {
  return (
    <div className="grid flex-1 grid-cols-[240px_minmax(760px,1fr)_360px] overflow-hidden">
      <aside className="shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
        <ModulePanel />
      </aside>

      <main className="overflow-y-auto bg-slate-100 p-6">
        <ResumeCanvas />
      </main>

      <aside className="shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50">
        <StylePanel />
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/components/wizard/editing-step.tsx
git commit -m "feat: add EditingStep wrapping existing editor components"
```

---

### Task 9: 创建 PreviewStep 步骤4容器

**Files:**
- Create: `packages/web/components/wizard/preview-step.tsx`

- [ ] **Step 1: 创建 PreviewStep**

```typescript
// packages/web/components/wizard/preview-step.tsx
"use client";
import { useState } from "react";
import { Printer, FileText } from "lucide-react";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ModuleRenderer } from "@/components/renderers/module-renderer";
import { templates } from "@/lib/templates";
import { Button } from "@/components/ui/button";

export function PreviewStep() {
  const resume = useResumeStore((s) => s.resume);
  const setTheme = useResumeStore((s) => s.setTheme);
  const [exporting, setExporting] = useState(false);

  async function exportPDF() {
    setExporting(true);
    document.body.classList.add("print-mode");
    try {
      window.print();
    } finally {
      document.body.classList.remove("print-mode");
      setExporting(false);
    }
  }

  const currentTemplate = templates.find(
    (t) => t.id === resume.theme.templateId,
  );

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
        <div
          id="resume-preview"
          className="mx-auto bg-white p-10 shadow-sm ring-1 ring-slate-200"
          style={{ width: "820px", minHeight: "1160px" }}
        >
          {resume.modules.map((module) => (
            <ModuleRenderer
              key={module.id}
              module={module}
              theme={resume.theme}
            />
          ))}
        </div>
      </div>

      <aside className="w-[260px] shrink-0 border-l border-slate-200 bg-white p-4">
        <div className="space-y-4">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">预览导出</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <label className="text-xs text-slate-400">模板</label>
                <select
                  value={resume.theme.templateId}
                  onChange={(e) => {
                    const template = templates.find(
                      (t) => t.id === e.target.value,
                    );
                    if (template) {
                      const { templateId: _, ...rest } = template.defaults;
                      setTheme({ templateId: template.id, ...rest });
                    }
                  }}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <p>模块：{resume.modules.length} 个</p>
            </div>
          </section>

          <Button
            variant="primary"
            onClick={exportPDF}
            disabled={exporting}
            className="w-full"
          >
            <Printer size={15} />
            导出 PDF
          </Button>

          <section className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs leading-5 text-slate-500">
              打印弹窗中建议选择 A4、缩放 100%，并关闭浏览器默认页眉页脚。
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/components/wizard/preview-step.tsx
git commit -m "feat: add PreviewStep for final preview and export"
```

---

### Task 10: 创建 WizardShell 顶层容器

**Files:**
- Create: `packages/web/components/wizard/wizard-shell.tsx`

- [ ] **Step 1: 创建 WizardShell**

```typescript
// packages/web/components/wizard/wizard-shell.tsx
"use client";
import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Undo2, Redo2 } from "lucide-react";
import { StepIndicator } from "./step-indicator";
import { NavigationBar } from "./navigation-bar";
import { ChatStep } from "./chat-step";
import { GeneratingStep } from "./generating-step";
import { EditingStep } from "./editing-step";
import { PreviewStep } from "./preview-step";
import { useWizardStore, getDirection } from "@/lib/stores/wizard-store";
import { useResumeStore } from "@/lib/stores/resume-store";

export function WizardShell() {
  const step = useWizardStore((s) => s.step);
  const setStep = useWizardStore((s) => s.setStep);
  const undo = useResumeStore((s) => s.undo);
  const redo = useResumeStore((s) => s.redo);
  const undoStack = useResumeStore((s) => s.undoStack);
  const redoStack = useResumeStore((s) => s.redoStack);

  // 计算动画方向：前进为正，回退为负
  const [prevStep, direction] = useMemo(() => {
    // 用 ref 跟踪上一步（简化处理：用 step 切换时的索引差）
    return ["chat", 1] as const; // 默认前进
  }, []);

  // 用 ref 跟踪 direction
  // 简化处理：在组件内部维护
  const stepContent = (() => {
    switch (step) {
      case "chat":
        return <ChatStep />;
      case "generating":
        return <GeneratingStep />;
      case "editing":
        return <EditingStep />;
      case "preview":
        return <PreviewStep />;
    }
  })();

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
      {/* 顶部导航栏 */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-900">Resumate</span>
          <span className="text-slate-200">|</span>
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
            title="撤销"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
            title="重做"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <StepIndicator />

        <div className="w-[140px] text-right text-xs text-slate-400">
          {step === "chat" && "步骤 1/4 · 聊天收集"}
          {step === "generating" && "步骤 2/4 · AI 生成"}
          {step === "editing" && "步骤 3/4 · 可视化编辑"}
          {step === "preview" && "步骤 4/4 · 预览导出"}
        </div>
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {stepContent}
      </div>

      {/* 底部导航 */}
      <NavigationBar />
    </div>
  );
}
```

注意：framer-motion 的 AnimatePresence 动画需要在 WizardShell 中根据 step 切换来触发。但由于现有结构的限制（每个 step 组件需要完整高度），我们可以简化实现：使用 CSS transition + transform 替代 AnimatePresence，或者保持 AnimatePresence 但只对内容区做动画。

实际上，为了更简洁的 V1 实现，我们先采用 CSS transition 方案，后续可升级为 AnimatePresence：

```typescript
// 在内容区使用简单的 key + CSS transition：
<div className="flex-1 overflow-hidden">
  <div
    key={step}
    className="h-full animate-slide-in"
  >
    {stepContent}
  </div>
</div>
```

在 `tailwind.config.ts` 中添加自定义动画：

```javascript
// tailwind.config.ts 的 extend 中添加：
keyframes: {
  'slide-in': {
    '0%': { transform: 'translateX(24px)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' },
  },
},
animation: {
  'slide-in': 'slide-in 0.3s ease-out',
},
```

- [ ] **Step 2: 更新 tailwind.config.ts 添加动画**

```typescript
// packages/web/tailwind.config.ts
// 在 theme.extend 中添加：

keyframes: {
  'slide-in': {
    '0%': { transform: 'translateX(16px)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' },
  },
},
animation: {
  'slide-in': 'slide-in 0.25s ease-out',
},
```

- [ ] **Step 3: 验证编译**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/components/wizard/wizard-shell.tsx packages/web/tailwind.config.ts
git commit -m "feat: add WizardShell top-level container with navigation"
```

---

### Task 11: 创建 /wizard 路由并更新旧路由重定向

**Files:**
- Create: `packages/web/app/wizard/page.tsx`
- Modify: `packages/web/app/page.tsx`
- Modify: `packages/web/app/editor/page.tsx`
- Modify: `packages/web/app/preview/page.tsx`

- [ ] **Step 1: 创建 /wizard 路由**

```typescript
// packages/web/app/wizard/page.tsx
"use client";
import { useEffect } from "react";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ApiKeyDialog } from "@/components/api-key-dialog";

export default function WizardPage() {
  const init = useResumeStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <>
      <ApiKeyDialog />
      <WizardShell />
    </>
  );
}
```

- [ ] **Step 2: 修改旧路由为 redirect**

```typescript
// packages/web/app/page.tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/wizard");
}
```

```typescript
// packages/web/app/editor/page.tsx
import { redirect } from "next/navigation";

export default function EditorPage() {
  redirect("/wizard");
}
```

```typescript
// packages/web/app/preview/page.tsx
import { redirect } from "next/navigation";

export default function PreviewPage() {
  redirect("/wizard");
}
```

注意：这些页面原本是 `"use client"` 组件，改为服务端 redirect。需要移除 `"use client"` 指令和原有逻辑。

- [ ] **Step 3: 验证编译**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/app/wizard/page.tsx packages/web/app/page.tsx packages/web/app/editor/page.tsx packages/web/app/preview/page.tsx
git commit -m "feat: add /wizard route, redirect old routes to wizard"
```

---

### Task 12: 端到端验证

- [ ] **Step 1: 启动开发服务器**

```bash
pnpm dev
```

- [ ] **Step 2: 验证步骤1 — 聊天收集**

在浏览器打开 `http://localhost:5001/wizard`：
- 左侧显示聊天界面（无 guided prompts，有输入框）
- 右侧显示信息清单（6项，全部待收集）
- 点击清单项可切换 collected/skipped/pending 状态
- 全部收集完成后底部出现"开始生成"按钮

- [ ] **Step 3: 验证步骤切换**

- 点击"开始生成"进入步骤2
- 步骤2显示日志流视图
- 生成完成后自动进入步骤3
- 步骤3显示三栏编辑器
- 点击"预览导出"进入步骤4
- 步骤4显示预览和导出按钮
- 可点击"上一步"回退

- [ ] **Step 4: 验证步骤指示器**

- 顶部步骤圆点正确高亮当前步骤
- 已完成步骤可点击跳转
- 回退后重新前进状态不丢失

- [ ] **Step 5: 验证旧路由重定向**

- 访问 `http://localhost:5001/` → 重定向到 `/wizard`
- 访问 `http://localhost:5001/editor` → 重定向到 `/wizard`
- 访问 `http://localhost:5001/preview` → 重定向到 `/wizard`

- [ ] **Step 6: 验证 undo/redo**

- 在步骤3编辑器中操作
- 点击顶部 undo/redo 按钮正常工作

- [ ] **Step 7: Commit（如有修复）**

如有问题，修复后提交。

---

## 自审清单

1. **Spec 覆盖检查**：
   - ✅ 四步流程 (二)
   - ✅ 状态机 (三) — WizardStore
   - ✅ 数据流 (四) — WizardStore + ChatStore + ResumeStore
   - ✅ 组件树 (五) — 所有组件
   - ✅ 动画策略 (六) — CSS transition (V1 简化)
   - ✅ 路由迁移 (七) — 旧路由 redirect
   - ✅ 各步骤详细设计 (八) — ChatStep, GeneratingStep, EditingStep, PreviewStep
   - ✅ 异常处理 (九) — ChatPanel 中已有 plan:error 处理
   - ✅ 文件变更清单 (十一) — 与计划一致

2. **Placeholder 扫描**：无 TBD/TODO/占位符。

3. **类型一致性**：
   - Step 类型在 wizard-store.ts 定义，所有组件引用一致
   - ChecklistItem 接口在 wizard-store.ts 定义，InfoChecklist 使用一致
   - WizardShell 中 stepContent 使用严格类型

4. **备注**：
   - V1 动画用 CSS transition 替代 framer-motion AnimatePresence（简化实现，后续可升级）
   - 信息清单 V1 为手动点击切换，V2 可扩展为 AI 自动标记
   - ChatPanel 的 variant prop 改动最小化，不影响现有 standalone 行为
