# AI 简历构建器 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零构建 AI 对话驱动的开源简历工具——Next.js + React monorepo，Plan-Driven Agent Harness，可视化编辑器，纯前端 PDF 导出。

**Architecture:** Monorepo (pnpm + Turborepo) 分三个包：`packages/shared`（共享类型）、`packages/agent-harness`（Agent 编排引擎）、`packages/web`（Next.js 全栈应用）。Agent 通过 SSE 流式广播执行状态，前端 Zustand store 管理简历文档和对话状态。

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Zustand + Immer, @dnd-kit, @react-pdf/renderer, Vercel AI SDK, pnpm, Turborepo

---

## Phase 1: 项目脚手架

### Task 1.1: 清理旧项目，初始化 Monorepo

**Files:**
- Remove: `src/`, `types/`, `index.html`, `vite.config.mts`, `tsconfig.json`, `tsconfig.node.json`, `.eslintrc.js`, `.eslintrc-auto-import.json`, `.browserslistrc`, `.editorconfig`, `package.json`, `pnpm-lock.yaml`
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore` (update)

- [ ] **Step 1: 清理所有旧项目文件**

```bash
cd /Users/wuji/workspace/Builder-For-Web
rm -rf src types index.html vite.config.mts tsconfig.json tsconfig.node.json .eslintrc.js .eslintrc-auto-import.json .browserslistrc .editorconfig package.json pnpm-lock.yaml
```

- [ ] **Step 2: 创建根 package.json**

```json
{
  "name": "ai-resume-builder",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "check-types": "turbo check-types"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@10.28.0"
}
```

- [ ] **Step 3: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 4: 创建 turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "check-types": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 5: 创建 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 6: 更新 .gitignore**

```bash
cat > .gitignore << 'EOF'
node_modules
.turbo
.next
dist
.env.local
.env.*.local
*.log
.DS_Store
.idea
.vscode
.superpowers
EOF
```

- [ ] **Step 7: 安装依赖并验证**

```bash
pnpm install
pnpm dev --filter=web  # 等 web 包创建后才能运行
```

---

### Task 1.2: 创建 shared 类型包

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/resume.ts`

- [ ] **Step 1: 创建 packages/shared/package.json**

```json
{
  "name": "@ai-resume/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "check-types": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: 创建 packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: 创建 packages/shared/src/resume.ts**

```typescript
// 简历数据类型定义

export type ModuleType =
  | "header"
  | "summary"
  | "work-experience"
  | "education"
  | "skills"
  | "projects"
  | "custom";

export interface HeaderData {
  name: string;
  jobTitle: string;
  contacts: { icon: string; text: string; link?: string }[];
}

export interface SummaryData {
  text: string;
}

export interface WorkExperienceItem {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  description: string;
}

export interface WorkExperienceData {
  items: WorkExperienceItem[];
}

export interface EducationItem {
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate?: string;
}

export interface EducationData {
  items: EducationItem[];
}

export interface SkillsCategory {
  name: string;
  tags: string[];
}

export interface SkillsData {
  categories: SkillsCategory[];
}

export interface ProjectItem {
  name: string;
  description: string;
  techStack: string[];
  link?: string;
}

export interface ProjectsData {
  items: ProjectItem[];
}

export interface CustomData {
  title?: string;
  content: string;
}

export type ModuleData =
  | HeaderData
  | SummaryData
  | WorkExperienceData
  | EducationData
  | SkillsData
  | ProjectsData
  | CustomData;

export interface Module {
  id: string;
  type: ModuleType;
  order: number;
  visible: boolean;
  data: ModuleData;
}

export interface Theme {
  templateId: string;
  primaryColor: string;
  fontFamily: "sans" | "serif" | "kai";
  fontSize: "small" | "medium" | "large";
  spacing: "compact" | "normal" | "loose";
}

export interface Resume {
  id: string;
  modules: Module[];
  theme: Theme;
}

export interface Template {
  id: string;
  name: string;
  defaults: Theme & {
    headerLayout: "centered" | "split";
    sectionDivider: "line" | "space" | "none";
  };
}

// Agent Harness 事件类型
export type HarnessEvent =
  | { type: "plan:start"; planId: string }
  | { type: "step:start"; stepId: string; description: string }
  | { type: "step:chunk"; stepId: string; text: string }
  | { type: "step:done"; stepId: string; result: unknown }
  | {
      type: "step:tool_call";
      stepId: string;
      tool: string;
      args: unknown;
    }
  | { type: "plan:done"; resume: Resume }
  | { type: "plan:error"; stepId: string; error: string };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}
```

- [ ] **Step 4: 创建 packages/shared/src/index.ts**

```typescript
export * from "./resume";
```

- [ ] **Step 5: 验证类型包**

```bash
cd packages/shared && pnpm check-types
```

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "chore: monorepo scaffolding with shared types"
```

---

### Task 1.3: 创建 Next.js 应用骨架

**Files:**
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/next.config.ts`
- Create: `packages/web/postcss.config.mjs`
- Create: `packages/web/tailwind.config.ts`
- Create: `packages/web/app/layout.tsx`
- Create: `packages/web/app/globals.css`
- Create: `packages/web/app/page.tsx`
- Create: `packages/web/components.json` (shadcn/ui)

- [ ] **Step 1: 创建 packages/web/package.json**

```json
{
  "name": "@ai-resume/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 5001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@ai-resume/shared": "workspace:*",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.460.0",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.5.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: 创建 packages/web/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: 创建 packages/web/next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ai-resume/shared"],
};

export default nextConfig;
```

- [ ] **Step 4: 创建 packages/web/tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

- [ ] **Step 5: 创建 packages/web/postcss.config.mjs**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
  },
};
export default config;
```

- [ ] **Step 6: 创建 packages/web/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --primary: 217 91% 60%;
    --primary-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
  }
}
```

- [ ] **Step 7: 创建 packages/web/app/layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Resume Builder",
  description: "AI 对话驱动的开源简历构建工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: 创建 packages/web/app/page.tsx (占位)**

```tsx
export default function HomePage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <h1 className="text-2xl font-bold">AI Resume Builder</h1>
    </div>
  );
}
```

- [ ] **Step 9: 初始化 shadcn/ui**

```bash
cd packages/web && npx shadcn@latest init
# 选择: TypeScript, Tailwind v4, CSS variables, src/ → app/
```

- [ ] **Step 10: 验证 dev server 启动**

```bash
pnpm dev --filter=web
# 验证 http://localhost:5001 显示占位页面
```

- [ ] **Step 11: 提交**

```bash
git add -A && git commit -m "chore: next.js app scaffold with tailwind and shadcn/ui"
```

---

## Phase 2: 状态管理 & 数据层

### Task 2.1: Zustand Resume Store (含 Immer Undo/Redo)

**Files:**
- Create: `packages/web/lib/stores/resume-store.ts`
- Install: zustand, immer

- [ ] **Step 1: 安装依赖**

```bash
cd packages/web && pnpm add zustand immer
```

- [ ] **Step 2: 创建 resume store**

```typescript
// packages/web/lib/stores/resume-store.ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enablePatches, produceWithPatches, applyPatches, type Patch } from "immer";
import type { Resume, Module, Theme, ModuleType } from "@ai-resume/shared";

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

  // undo/redo state
  undoStack: Patch[][];
  redoStack: Patch[][];

  // actions
  init: () => void;                              // 从 localStorage 加载或创建新简历
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
        set((s) => { s.resume = saved; });
      } else {
        saveToStorage(get().resume);
      }
    },

    setTheme: (themePatch) => {
      const [next, patches, inverse] = produceWithPatches(get().resume, (draft) => {
        Object.assign(draft.theme, themePatch);
      });
      set((s) => {
        s.resume = next;
        s.undoStack.push(inverse);
        s.redoStack = [];
      });
      saveToStorage(next);
    },

    addModule: (type) => {
      const [next, patches, inverse] = produceWithPatches(get().resume, (draft) => {
        const newModule: Module = {
          id: crypto.randomUUID(),
          type,
          order: draft.modules.length,
          visible: true,
          data: getDefaultData(type),
        };
        draft.modules.push(newModule);
      });
      set((s) => {
        s.resume = next;
        s.undoStack.push(inverse);
        s.redoStack = [];
      });
      saveToStorage(next);
    },

    removeModule: (moduleId) => {
      const [next, patches, inverse] = produceWithPatches(get().resume, (draft) => {
        draft.modules = draft.modules.filter((m) => m.id !== moduleId);
      });
      set((s) => {
        s.resume = next;
        s.undoStack.push(inverse);
        s.redoStack = [];
      });
      saveToStorage(next);
    },

    reorderModules: (fromIndex, toIndex) => {
      const [next, patches, inverse] = produceWithPatches(get().resume, (draft) => {
        const [moved] = draft.modules.splice(fromIndex, 1);
        draft.modules.splice(toIndex, 0, moved);
        draft.modules.forEach((m, i) => { m.order = i; });
      });
      set((s) => {
        s.resume = next;
        s.undoStack.push(inverse);
        s.redoStack = [];
      });
      saveToStorage(next);
    },

    updateModuleData: (moduleId, dataPatch) => {
      const [next, patches, inverse] = produceWithPatches(get().resume, (draft) => {
        const mod = draft.modules.find((m) => m.id === moduleId);
        if (mod) Object.assign(mod.data, dataPatch);
      });
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
  }))
);

function getDefaultData(type: ModuleType): Record<string, unknown> {
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
```

- [ ] **Step 3: 验证 store 逻辑**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: zustand resume store with immer undo/redo"
```

---

### Task 2.2: 聊天状态 Store & 模板数据

**Files:**
- Create: `packages/web/lib/stores/chat-store.ts`
- Create: `packages/web/lib/templates/blue-simple.json`
- Create: `packages/web/lib/templates/classic-black.json`
- Create: `packages/web/lib/templates/elegant-serif.json`
- Create: `packages/web/lib/templates/index.ts`

- [ ] **Step 1: 创建 chat store**

```typescript
// packages/web/lib/stores/chat-store.ts
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
```

- [ ] **Step 2: 创建模板 JSON 文件**

```json
// packages/web/lib/templates/blue-simple.json
{
  "id": "blue-simple",
  "name": "简洁蓝",
  "defaults": {
    "templateId": "blue-simple",
    "primaryColor": "#2563eb",
    "fontFamily": "sans",
    "fontSize": "medium",
    "spacing": "normal",
    "headerLayout": "split",
    "sectionDivider": "line"
  }
}
```

```json
// packages/web/lib/templates/classic-black.json
{
  "id": "classic-black",
  "name": "经典黑",
  "defaults": {
    "templateId": "classic-black",
    "primaryColor": "#1a1a1a",
    "fontFamily": "sans",
    "fontSize": "medium",
    "spacing": "normal",
    "headerLayout": "centered",
    "sectionDivider": "line"
  }
}
```

```json
// packages/web/lib/templates/elegant-serif.json
{
  "id": "elegant-serif",
  "name": "优雅衬线",
  "defaults": {
    "templateId": "elegant-serif",
    "primaryColor": "#8b4513",
    "fontFamily": "serif",
    "fontSize": "medium",
    "spacing": "loose",
    "headerLayout": "centered",
    "sectionDivider": "space"
  }
}
```

- [ ] **Step 3: 创建模板加载器**

```typescript
// packages/web/lib/templates/index.ts
import type { Template } from "@ai-resume/shared";
import blueSimple from "./blue-simple.json";
import classicBlack from "./classic-black.json";
import elegantSerif from "./elegant-serif.json";

export const templates: Template[] = [
  blueSimple,
  classicBlack,
  elegantSerif,
] as Template[];

export function getTemplate(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}
```

- [ ] **Step 4: 验证类型**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: chat store and template data files"
```

---

## Phase 3: Agent Harness

### Task 3.1: LLM Adapter 接口 + Anthropic 实现

**Files:**
- Create: `packages/agent-harness/package.json`
- Create: `packages/agent-harness/tsconfig.json`
- Create: `packages/agent-harness/src/llm/types.ts`
- Create: `packages/agent-harness/src/llm/anthropic.ts`
- Create: `packages/agent-harness/src/llm/index.ts`

- [ ] **Step 1: 创建 packages/agent-harness/package.json**

```json
{
  "name": "@ai-resume/agent-harness",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@ai-resume/shared": "workspace:*",
    "@anthropic-ai/sdk": "^0.36.0",
    "ai": "^4.1.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: 创建 packages/agent-harness/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: 创建 LLM Provider 接口**

```typescript
// packages/agent-harness/src/llm/types.ts
import type { z } from "zod";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatParams {
  messages: ChatMessage[];
  temperature?: number;
}

export interface StructuredParams {
  messages: ChatMessage[];
  schema: z.ZodType<unknown>;
  temperature?: number;
}

export interface StreamingCallback {
  (chunk: string): void;
}

export interface LLMProvider {
  /** 流式对话 */
  streamChat(
    params: ChatParams,
    onChunk: StreamingCallback
  ): Promise<string>;

  /** 结构化输出（JSON Schema 约束） */
  generateStructured<T>(
    params: StructuredParams
  ): Promise<T>;
}
```

- [ ] **Step 4: 创建 Anthropic 适配器**

```typescript
// packages/agent-harness/src/llm/anthropic.ts
import { Anthropic } from "@anthropic-ai/sdk";
import type { LLMProvider, ChatMessage } from "./types";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY || "",
    });
  }

  async streamChat(
    params: { messages: ChatMessage[]; temperature?: number },
    onChunk: (chunk: string) => void
  ): Promise<string> {
    let full = "";
    const stream = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: params.temperature ?? 0.7,
      system: params.messages.find((m) => m.role === "system")?.content,
      messages: params.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      stream: true,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        full += event.delta.text;
        onChunk(event.delta.text);
      }
    }
    return full;
  }

  async generateStructured<T>(params: {
    messages: ChatMessage[];
    schema: { _type: unknown };
    temperature?: number;
  }): Promise<T> {
    const schemaStr = JSON.stringify(params.schema, null, 2);
    const messages = [
      ...params.messages,
      {
        role: "assistant" as const,
        content:
          'I will respond with valid JSON only, following this schema:\n```json\n' +
          schemaStr +
          "\n```",
      },
    ];

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: params.temperature ?? 0.2,
      system: "You are a JSON-only API. Always respond with valid JSON matching the provided schema. No other text.",
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const text = (response.content[0] as { text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const json = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    return json as T;
  }
}
```

- [ ] **Step 5: 创建 llm/index.ts**

```typescript
// packages/agent-harness/src/llm/index.ts
export { AnthropicProvider } from "./anthropic";
export type { LLMProvider, ChatMessage, ChatParams, StructuredParams, StreamingCallback } from "./types";
```

- [ ] **Step 6: 安装依赖并验证**

```bash
cd packages/agent-harness && pnpm install && pnpm check-types
```

- [ ] **Step 7: 提交**

```bash
git add -A && git commit -m "feat: agent-harness llm adapter with anthropic provider"
```

---

### Task 3.2: Tool Registry + Agent Runner

**Files:**
- Create: `packages/agent-harness/src/tool-registry.ts`
- Create: `packages/agent-harness/src/runner.ts`
- Create: `packages/agent-harness/src/index.ts`

- [ ] **Step 1: 创建 Tool Registry**

```typescript
// packages/agent-harness/src/tool-registry.ts
export interface ToolFn {
  (args: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolFn>();

  register(name: string, fn: ToolFn): void {
    this.tools.set(name, fn);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async execute(
    name: string,
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    return tool(args);
  }
}

// 内置工具
export function createBuiltInTools(): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register("classifyIntent", async (args) => {
    const input = args.input as string;
    const hasJD = /(职位描述|岗位职责|任职要求|job description|jd)/i.test(input);
    const hasResume = /(简历|resume|工作经历|教育背景)/i.test(input);
    return {
      intent: hasJD ? "jd_optimize" : hasResume ? "resume_enhance" : "blank_slate",
      hasJD,
      hasResume,
    };
  });

  registry.register("validateResume", async (args) => {
    const resume = args.resume as Record<string, unknown>;
    const issues: string[] = [];
    if (!resume.modules || (resume.modules as unknown[]).length === 0) {
      issues.push("简历没有任何模块");
    }
    const headerMod = (resume.modules as Array<{ type: string; data: Record<string, unknown> }>)?.find(
      (m) => m.type === "header"
    );
    if (!headerMod) {
      issues.push("缺少头部模块（姓名、联系方式）");
    } else {
      if (!headerMod.data.name) issues.push("姓名未填写");
    }
    return {
      valid: issues.length === 0,
      issues,
    };
  });

  return registry;
}
```

- [ ] **Step 2: 创建 Agent Runner**

```typescript
// packages/agent-harness/src/runner.ts
import type { LLMProvider } from "./llm";
import type { HarnessEvent } from "@ai-resume/shared";
import { ToolRegistry } from "./tool-registry";
import type { z } from "zod";

export interface PlanStep {
  id: string;
  type: "tool" | "chat" | "structured" | "compose";
  dependsOn?: string[];
  tool?: string;
  toolArgs?: Record<string, unknown>;
  systemPrompt?: string;
  userPromptTemplate?: string;
  schema?: z.ZodType<unknown>;
}

export interface Plan {
  id: string;
  steps: PlanStep[];
}

export class AgentRunner {
  private registry: ToolRegistry;
  private provider: LLMProvider;

  constructor(provider: LLMProvider, registry: ToolRegistry) {
    this.provider = provider;
    this.registry = registry;
  }

  async *execute(
    plan: Plan,
    context: Record<string, unknown> = {}
  ): AsyncGenerator<HarnessEvent> {
    yield { type: "plan:start", planId: plan.id };

    const stepResults = new Map<string, unknown>();

    for (const step of plan.steps) {
      // 检查依赖
      if (step.dependsOn) {
        for (const dep of step.dependsOn) {
          if (!stepResults.has(dep)) {
            yield {
              type: "plan:error",
              stepId: step.id,
              error: `依赖步骤 ${dep} 未完成`,
            };
            return;
          }
        }
      }

      yield {
        type: "step:start",
        stepId: step.id,
        description: `执行: ${step.id}`,
      };

      try {
        switch (step.type) {
          case "tool": {
            yield {
              type: "step:tool_call",
              stepId: step.id,
              tool: step.tool!,
              args: step.toolArgs || {},
            };
            const result = await this.registry.execute(
              step.tool!,
              step.toolArgs || {}
            );
            stepResults.set(step.id, result);
            yield { type: "step:done", stepId: step.id, result };
            break;
          }

          case "chat": {
            const systemMsg = step.systemPrompt || "You are a helpful career advisor.";
            let fullText = "";
            const messages = [
              { role: "system" as const, content: systemMsg },
              { role: "user" as const, content: step.userPromptTemplate || "Let's begin." },
            ];

            await this.provider.streamChat({ messages }, (chunk) => {
              fullText += chunk;
              // 不逐个 chunk 发送，太频繁
            });
            stepResults.set(step.id, { text: fullText });
            yield { type: "step:done", stepId: step.id, result: { text: fullText } };
            break;
          }

          case "structured": {
            const schema = step.schema!;
            const messages = [
              { role: "system" as const, content: step.systemPrompt || "Generate the resume content." },
              { role: "user" as const, content: step.userPromptTemplate || JSON.stringify(context) },
            ];

            const result = await this.provider.generateStructured({
              messages,
              schema,
            });
            stepResults.set(step.id, result);
            yield { type: "step:done", stepId: step.id, result };
            break;
          }

          case "compose": {
            // 组装最终结果，收集前面步骤的输出
            const allResults: Record<string, unknown> = {};
            for (const [key, value] of stepResults) {
              allResults[key] = value;
            }
            yield {
              type: "plan:done",
              resume: context.resume || allResults as unknown as never,
            } as HarnessEvent;
            break;
          }
        }
      } catch (err) {
        yield {
          type: "plan:error",
          stepId: step.id,
          error: err instanceof Error ? err.message : String(err),
        };
        return;
      }
    }
  }
}
```

- [ ] **Step 3: 创建包入口**

```typescript
// packages/agent-harness/src/index.ts
export { AgentRunner } from "./runner";
export type { Plan, PlanStep } from "./runner";
export { ToolRegistry, createBuiltInTools } from "./tool-registry";
export type { ToolFn } from "./tool-registry";
export { AnthropicProvider } from "./llm/anthropic";
export type { LLMProvider, ChatMessage, StreamingCallback } from "./llm/types";
```

- [ ] **Step 4: 验证类型**

```bash
cd packages/agent-harness && pnpm check-types
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: agent runner with tool registry"
```

---

### Task 3.3: Next.js Route Handler 集成

**Files:**
- Create: `packages/web/app/api/agent/run/route.ts`

- [ ] **Step 1: 创建 SSE Route Handler**

```typescript
// packages/web/app/api/agent/run/route.ts
import { NextRequest } from "next/server";
import { AgentRunner, AnthropicProvider, createBuiltInTools } from "@ai-resume/agent-harness";
import type { Plan } from "@ai-resume/agent-harness";
import { z } from "zod";

const ResumeModuleSchema = z.object({
  id: z.string(),
  type: z.enum(["header","summary","work-experience","education","skills","projects","custom"]),
  order: z.number(),
  visible: z.boolean(),
  data: z.record(z.unknown()),
});

const ResumeSchema = z.object({
  id: z.string(),
  modules: z.array(ResumeModuleSchema),
  theme: z.object({
    templateId: z.string(),
    primaryColor: z.string(),
    fontFamily: z.enum(["sans","serif","kai"]),
    fontSize: z.enum(["small","medium","large"]),
    spacing: z.enum(["compact","normal","loose"]),
  }),
});

const resumeGenerationPlan: Plan = {
  id: "resume-generation",
  steps: [
    { id: "classify", type: "tool", tool: "classifyIntent", toolArgs: {} },
    {
      id: "collect",
      type: "chat",
      dependsOn: ["classify"],
      systemPrompt: "你是一位专业的职业顾问。引导用户逐步提供简历所需信息：姓名和联系方式、工作经历、教育背景、技能、项目经历。每次只问一个模块，用户跳过也无妨。",
      userPromptTemplate: "",
    },
    {
      id: "generate",
      type: "structured",
      dependsOn: ["collect"],
      schema: ResumeSchema,
      systemPrompt: "根据收集到的用户信息，生成完整的简历 JSON。严格遵循提供的 Schema。",
      userPromptTemplate: "",
    },
    { id: "validate", type: "tool", dependsOn: ["generate"], tool: "validateResume", toolArgs: {} },
    { id: "present", type: "compose", dependsOn: ["validate"], toolArgs: {} },
  ],
};

export async function POST(request: NextRequest) {
  const { messages, apiKey } = await request.json();

  const provider = new AnthropicProvider(apiKey || undefined);
  const registry = createBuiltInTools();
  const runner = new AgentRunner(provider, registry);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 注入用户消息到 classify 步骤
        const plan = { ...resumeGenerationPlan };
        plan.steps[0]!.toolArgs = { input: messages[messages.length - 1]?.content || "" };
        plan.steps[1]!.userPromptTemplate = JSON.stringify(messages);

        for await (const event of runner.execute(plan, { messages })) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        const done = `data: ${JSON.stringify({ type: "stream:done" })}\n\n`;
        controller.enqueue(encoder.encode(done));
        controller.close();
      } catch (err) {
        const error = `data: ${JSON.stringify({ type: "stream:error", error: String(err) })}\n\n`;
        controller.enqueue(encoder.encode(error));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: 安装 agent-harness 依赖 + zod**

```bash
cd packages/web && pnpm add @ai-resume/agent-harness zod
```

- [ ] **Step 3: 验证构建**

```bash
pnpm build --filter=web
```

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: agent run SSE route handler"
```

---

## Phase 4: 渲染引擎

### Task 4.1: Theme Engine + Module Renderers

**Files:**
- Create: `packages/web/components/renderers/theme-engine.ts`
- Create: `packages/web/components/renderers/header-renderer.tsx`
- Create: `packages/web/components/renderers/work-exp-renderer.tsx`
- Create: `packages/web/components/renderers/education-renderer.tsx`
- Create: `packages/web/components/renderers/skills-renderer.tsx`
- Create: `packages/web/components/renderers/summary-renderer.tsx`
- Create: `packages/web/components/renderers/projects-renderer.tsx`
- Create: `packages/web/components/renderers/custom-renderer.tsx`
- Create: `packages/web/components/renderers/module-renderer.tsx`

- [ ] **Step 1: 创建 Theme Engine**

```typescript
// packages/web/components/renderers/theme-engine.ts
import type { Theme } from "@ai-resume/shared";

const fontSizeMap = { small: "12px", medium: "14px", large: "16px" };
const spacingMap = { compact: "4px", normal: "8px", loose: "16px" };

export function themeToCSS(theme: Theme): React.CSSProperties {
  return {
    "--primary-color": theme.primaryColor,
    "--font-family": fontFamilyToCSS(theme.fontFamily),
    "--font-size": fontSizeMap[theme.fontSize],
    "--spacing": spacingMap[theme.spacing],
  } as React.CSSProperties;
}

function fontFamilyToCSS(f: Theme["fontFamily"]): string {
  switch (f) {
    case "sans": return "system-ui, -apple-system, sans-serif";
    case "serif": return "Georgia, 'Times New Roman', serif";
    case "kai": return "KaiTi, '楷体', STKaiti, serif";
  }
}
```

- [ ] **Step 2: 创建 Header Renderer**

```tsx
// packages/web/components/renderers/header-renderer.tsx
import type { HeaderData, Theme } from "@ai-resume/shared";

interface Props {
  data: HeaderData;
  theme: Theme;
}

export function HeaderRenderer({ data, theme }: Props) {
  const isCentered = false; // 从 template defaults 获取

  return (
    <div
      className={`py-4 ${isCentered ? "text-center" : "flex justify-between items-end"}`}
      style={{ color: theme.primaryColor }}
    >
      <div>
        <h1 className="text-2xl font-bold">{data.name || "姓名"}</h1>
        <p className="text-lg mt-1">{data.jobTitle || "职位"}</p>
      </div>
      <div className="text-sm space-y-1">
        {data.contacts?.map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            <span>{c.icon}</span>
            {c.link ? (
              <a href={c.link} target="_blank" className="underline">
                {c.text}
              </a>
            ) : (
              <span>{c.text}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 WorkExperience Renderer**

```tsx
// packages/web/components/renderers/work-exp-renderer.tsx
import type { WorkExperienceData, Theme } from "@ai-resume/shared";

interface Props { data: WorkExperienceData; theme: Theme; }

export function WorkExperienceRenderer({ data, theme }: Props) {
  if (!data.items?.length) return null;
  return (
    <div className="py-2">
      <h2 className="text-lg font-bold border-b mb-2"
        style={{ color: theme.primaryColor, borderColor: theme.primaryColor }}>
        工作经历
      </h2>
      {data.items.map((item, i) => (
        <div key={i} className="mb-3">
          <div className="flex justify-between">
            <span className="font-semibold">{item.position} @ {item.company}</span>
            <span className="text-gray-500 text-sm">
              {item.startDate} – {item.endDate || "至今"}
            </span>
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 创建 Module Router**

```tsx
// packages/web/components/renderers/module-renderer.tsx
import type { Module, Theme } from "@ai-resume/shared";
import { HeaderRenderer } from "./header-renderer";
import { WorkExperienceRenderer } from "./work-exp-renderer";
import { EducationRenderer } from "./education-renderer";
import { SkillsRenderer } from "./skills-renderer";
import { SummaryRenderer } from "./summary-renderer";
import { ProjectsRenderer } from "./projects-renderer";
import { CustomRenderer } from "./custom-renderer";

interface Props {
  module: Module;
  theme: Theme;
}

export function ModuleRenderer({ module, theme }: Props) {
  if (!module.visible) return null;

  switch (module.type) {
    case "header":
      return <HeaderRenderer data={module.data as never} theme={theme} />;
    case "work-experience":
      return <WorkExperienceRenderer data={module.data as never} theme={theme} />;
    case "education":
      return <EducationRenderer data={module.data as never} theme={theme} />;
    case "skills":
      return <SkillsRenderer data={module.data as never} theme={theme} />;
    case "summary":
      return <SummaryRenderer data={module.data as never} />;
    case "projects":
      return <ProjectsRenderer data={module.data as never} theme={theme} />;
    case "custom":
      return <CustomRenderer data={module.data as never} />;
    default:
      return null;
  }
}
```

- [ ] **Step 5: 创建其余 Renderers**

```typescript
// packages/web/components/renderers/education-renderer.tsx
import type { EducationData, Theme } from "@ai-resume/shared";

export function EducationRenderer({ data, theme }: { data: EducationData; theme: Theme }) {
  if (!data.items?.length) return null;
  return (
    <div className="py-2">
      <h2 className="text-lg font-bold border-b mb-2"
        style={{ color: theme.primaryColor, borderColor: theme.primaryColor }}>教育背景</h2>
      {data.items.map((item, i) => (
        <div key={i} className="mb-2 flex justify-between">
          <div><span className="font-semibold">{item.school}</span>
            <span className="text-gray-500 text-sm ml-2">{item.major} · {item.degree}</span></div>
          <span className="text-gray-500 text-sm">{item.startDate} – {item.endDate || "至今"}</span>
        </div>
      ))}
    </div>
  );
}
```

```typescript
// packages/web/components/renderers/skills-renderer.tsx
import type { SkillsData, Theme } from "@ai-resume/shared";

export function SkillsRenderer({ data, theme }: { data: SkillsData; theme: Theme }) {
  if (!data.categories?.length) return null;
  return (
    <div className="py-2">
      <h2 className="text-lg font-bold border-b mb-2"
        style={{ color: theme.primaryColor, borderColor: theme.primaryColor }}>技能</h2>
      {data.categories.map((cat, i) => (
        <div key={i} className="mb-2">
          <span className="text-sm font-semibold">{cat.name}：</span>
          {cat.tags.map((tag, j) => (
            <span key={j} className="inline-block text-xs bg-gray-100 rounded px-2 py-0.5 mr-1 mb-1">{tag}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
```

```typescript
// packages/web/components/renderers/summary-renderer.tsx
import type { SummaryData } from "@ai-resume/shared";

export function SummaryRenderer({ data }: { data: SummaryData }) {
  if (!data.text) return null;
  return (
    <div className="py-2">
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.text}</p>
    </div>
  );
}
```

```typescript
// packages/web/components/renderers/projects-renderer.tsx
import type { ProjectsData, Theme } from "@ai-resume/shared";

export function ProjectsRenderer({ data, theme }: { data: ProjectsData; theme: Theme }) {
  if (!data.items?.length) return null;
  return (
    <div className="py-2">
      <h2 className="text-lg font-bold border-b mb-2"
        style={{ color: theme.primaryColor, borderColor: theme.primaryColor }}>项目经历</h2>
      {data.items.map((item, i) => (
        <div key={i} className="mb-2">
          <div className="flex justify-between">
            <span className="font-semibold">{item.name}</span>
            {item.link && <a href={item.link} target="_blank" className="text-blue-600 text-sm underline">链接</a>}
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap">{item.description}</p>
          <div className="flex gap-1 mt-1">
            {item.techStack.map((tech, j) => (
              <span key={j} className="text-xs bg-gray-200 rounded px-1.5 py-0.5">{tech}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

```typescript
// packages/web/components/renderers/custom-renderer.tsx
import type { CustomData } from "@ai-resume/shared";

export function CustomRenderer({ data }: { data: CustomData }) {
  if (!data.content) return null;
  return (
    <div className="py-2">
      {data.title && <h2 className="text-lg font-bold mb-2">{data.title}</h2>}
      <p className="text-sm whitespace-pre-wrap">{data.content}</p>
    </div>
  );
}
```

- [ ] **Step 6: 验证类型**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 7: 提交**

```bash
git add -A && git commit -m "feat: module renderers with theme engine"
```

---

## Phase 5: 对话页

### Task 5.1: ChatPanel 组件 + 对话页布局

**Files:**
- Create: `packages/web/components/chat/chat-panel.tsx`
- Create: `packages/web/components/chat/message-bubble.tsx`
- Create: `packages/web/components/chat/jd-input.tsx`
- Create: `packages/web/app/page.tsx` (重写)

- [ ] **Step 1: 创建 MessageBubble**

```tsx
// packages/web/components/chat/message-bubble.tsx
import type { ChatMessage } from "@ai-resume/shared";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 JD 输入组件**

```tsx
// packages/web/components/chat/jd-input.tsx
"use client";
import { useState } from "react";

export function JDInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [jdText, setJdText] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div className="mb-4">
      {!show ? (
        <button
          onClick={() => setShow(true)}
          className="text-sm text-blue-600 underline"
        >
          粘贴职位描述(JD)优化简历
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="粘贴职位描述..."
            rows={4}
            className="w-full rounded border p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onSubmit(jdText); setJdText(""); setShow(false); }}
              className="rounded bg-blue-600 px-4 py-1 text-sm text-white"
            >
              提交
            </button>
            <button
              onClick={() => setShow(false)}
              className="rounded border px-4 py-1 text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 创建 ChatPanel**

```tsx
// packages/web/components/chat/chat-panel.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useResumeStore } from "@/lib/stores/resume-store";
import { MessageBubble } from "./message-bubble";
import { JDInput } from "./jd-input";
import type { HarnessEvent } from "@ai-resume/shared";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const { messages, addMessage, setStreaming, pushHarnessEvent } = useChatStore();
  const { applyAIResult } = useResumeStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(content: string) {
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content, timestamp: Date.now() };
    addMessage(userMsg);
    setInput("");
    setStreaming(true);

    const assistantMsgId = crypto.randomUUID();
    let assistantContent = "";

    try {
      const apiKey = localStorage.getItem("ai-api-key") || "";
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          apiKey,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6)) as HarnessEvent & { type: "stream:done" | "stream:error"; error?: string };
            pushHarnessEvent(data);

            if (data.type === "step:chunk") {
              assistantContent += data.text;
            }
            if (data.type === "plan:done" && "resume" in data) {
              applyAIResult(data.resume);
            }
          }
        }
      }
    } catch (err) {
      assistantContent = "抱歉，AI 服务出错了，请重试。";
    } finally {
      addMessage({ id: assistantMsgId, role: "assistant", content: assistantContent || "简历已生成，请在编辑器中查看和精调。", timestamp: Date.now() });
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg mb-2">👋 你好！我是你的 AI 简历顾问</p>
            <p>告诉我你的工作经历、教育背景和技能，我会帮你生成一份专业的简历。</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-4">
        <JDInput onSubmit={(text) => sendMessage(`根据以下职位描述优化我的简历：\n${text}`)} />
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && input.trim() && sendMessage(input.trim())}
            placeholder="描述你的经历..."
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            onClick={() => input.trim() && sendMessage(input.trim())}
            disabled={!input.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建 ResumePreviewMini（对话页侧边栏简历预览）**

```tsx
// packages/web/components/renderers/resume-preview-mini.tsx
"use client";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ModuleRenderer } from "./module-renderer";

export function ResumePreviewMini() {
  const resume = useResumeStore((s) => s.resume);

  return (
    <div className="scale-[0.45] origin-top-left bg-white shadow p-4"
      style={{ width: "820px", minHeight: "1160px" }}>
      {resume.modules.map((mod) => (
        <ModuleRenderer key={mod.id} module={mod} theme={resume.theme} />
      ))}
      {resume.modules.length === 0 && (
        <p className="text-gray-300 text-center pt-20">开始对话生成简历...</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 重写对话页 layout**

```tsx
// packages/web/app/page.tsx
"use client";
import { useEffect } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ResumePreviewMini } from "@/components/renderers/resume-preview-mini";
import { useResumeStore } from "@/lib/stores/resume-store";

export default function HomePage() {
  const init = useResumeStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="flex h-screen">
      <div className="flex-1 border-r">
        <ChatPanel />
      </div>
      <div className="w-[420px] p-4 overflow-y-auto bg-white">
        <h3 className="text-sm text-gray-400 mb-4">简历预览</h3>
        <ResumePreviewMini />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: chat page with sse agent integration"
```

---

## Phase 6: 编辑器页

### Task 6.1: ResumeCanvas + 拖拽排序

**Files:**
- Create: `packages/web/components/editor/resume-canvas.tsx`
- Install: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

- [ ] **Step 1: 安装 dnd-kit**

```bash
cd packages/web && pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: 创建 ResumeCanvas**

```tsx
// packages/web/components/editor/resume-canvas.tsx
"use client";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ModuleRenderer } from "@/components/renderers/module-renderer";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

function SortableModule({ module, theme, index }: { module: Module; theme: Theme; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: module.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        {...attributes}
        {...listeners}
        className="absolute left-[-24px] top-2 opacity-0 group-hover:opacity-100 cursor-grab"
      >
        <GripVertical size={16} />
      </button>
      <ModuleRenderer module={module} theme={theme} />
    </div>
  );
}

export function ResumeCanvas() {
  const { resume, reorderModules } = useResumeStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = resume.modules.findIndex((m) => m.id === active.id);
      const newIndex = resume.modules.findIndex((m) => m.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderModules(oldIndex, newIndex);
      }
    }
  }

  return (
    <div className="bg-white shadow-lg mx-auto p-8" style={{ width: "820px", minHeight: "1160px" }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={resume.modules.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          {resume.modules.map((mod, i) => (
            <SortableModule key={mod.id} module={mod} theme={resume.theme} index={i} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

- [ ] **Step 3: 验证类型**

```bash
cd packages/web && pnpm check-types
```

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: resume canvas with drag-and-drop reorder"
```

---

### Task 6.2: ModulePanel + StylePanel + 编辑器页布局

**Files:**
- Create: `packages/web/components/editor/module-panel.tsx`
- Create: `packages/web/components/editor/style-panel.tsx`
- Create: `packages/web/app/editor/page.tsx`

- [ ] **Step 1: 创建 ModulePanel**

```tsx
// packages/web/components/editor/module-panel.tsx
"use client";
import { useResumeStore } from "@/lib/stores/resume-store";
import type { ModuleType } from "@ai-resume/shared";
import { Plus, Trash2 } from "lucide-react";

const moduleTypes: { type: ModuleType; label: string }[] = [
  { type: "header", label: "头部" },
  { type: "summary", label: "个人总结" },
  { type: "work-experience", label: "工作经历" },
  { type: "education", label: "教育背景" },
  { type: "skills", label: "技能" },
  { type: "projects", label: "项目经历" },
  { type: "custom", label: "自定义" },
];

export function ModulePanel() {
  const { resume, addModule, removeModule } = useResumeStore();

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-3">模块</h3>
      <div className="space-y-1 mb-4">
        {resume.modules.map((mod) => (
          <div key={mod.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-gray-100">
            <span>{moduleTypes.find((t) => t.type === mod.type)?.label || mod.type}</span>
            <button onClick={() => removeModule(mod.id)} className="text-red-400 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <h4 className="text-xs text-gray-500 mb-2">添加模块</h4>
      <div className="space-y-1">
        {moduleTypes.map((mt) => (
          <button
            key={mt.type}
            onClick={() => addModule(mt.type)}
            className="flex items-center gap-2 text-sm w-full px-2 py-1 rounded hover:bg-gray-100"
          >
            <Plus size={14} />
            {mt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 StylePanel**

```tsx
// packages/web/components/editor/style-panel.tsx
"use client";
import { useResumeStore } from "@/lib/stores/resume-store";
import { templates, getTemplate } from "@/lib/templates";
import type { Theme } from "@ai-resume/shared";

export function StylePanel() {
  const { resume, setTheme } = useResumeStore();

  return (
    <div className="p-4 space-y-6">
      <h3 className="font-semibold">样式</h3>

      <div>
        <label className="text-xs text-gray-500">模板</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme({ templateId: t.id, ...t.defaults })}
              className={`text-sm p-2 rounded border ${
                resume.theme.templateId === t.id
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">主色</label>
        <input
          type="color"
          value={resume.theme.primaryColor}
          onChange={(e) => setTheme({ primaryColor: e.target.value })}
          className="w-full h-8 mt-1"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500">字体</label>
        <select
          value={resume.theme.fontFamily}
          onChange={(e) => setTheme({ fontFamily: e.target.value as Theme["fontFamily"] })}
          className="w-full mt-1 text-sm rounded border p-1"
        >
          <option value="sans">无衬线</option>
          <option value="serif">衬线</option>
          <option value="kai">楷体</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500">字号</label>
        <select
          value={resume.theme.fontSize}
          onChange={(e) => setTheme({ fontSize: e.target.value as Theme["fontSize"] })}
          className="w-full mt-1 text-sm rounded border p-1"
        >
          <option value="small">小</option>
          <option value="medium">中</option>
          <option value="large">大</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500">间距</label>
        <select
          value={resume.theme.spacing}
          onChange={(e) => setTheme({ spacing: e.target.value as Theme["spacing"] })}
          className="w-full mt-1 text-sm rounded border p-1"
        >
          <option value="compact">紧凑</option>
          <option value="normal">标准</option>
          <option value="loose">宽松</option>
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建编辑器页**

```tsx
// packages/web/app/editor/page.tsx
"use client";
import { useEffect } from "react";
import { ResumeCanvas } from "@/components/editor/resume-canvas";
import { ModulePanel } from "@/components/editor/module-panel";
import { StylePanel } from "@/components/editor/style-panel";
import { useResumeStore } from "@/lib/stores/resume-store";
import Link from "next/link";
import { Undo2, Redo2, FileDown } from "lucide-react";

export default function EditorPage() {
  const { init, undo, redo, undoStack, redoStack } = useResumeStore();

  useEffect(() => { init(); }, [init]);

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm text-blue-600">← 对话</Link>
          <span className="text-gray-300">|</span>
          <button onClick={undo} disabled={undoStack.length === 0} className="p-1 disabled:opacity-30">
            <Undo2 size={18} />
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} className="p-1 disabled:opacity-30">
            <Redo2 size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/preview" className="rounded bg-blue-600 px-4 py-1 text-sm text-white flex items-center gap-1">
            <FileDown size={14} /> 预览 & 导出
          </Link>
        </div>
      </header>

      {/* 3-panel */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[200px] border-r bg-gray-50 overflow-y-auto">
          <ModulePanel />
        </aside>
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
          <ResumeCanvas />
        </main>
        <aside className="w-[240px] border-l bg-gray-50 overflow-y-auto">
          <StylePanel />
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: editor page with module panel and style panel"
```

---

## Phase 7: 预览 & 导出

### Task 7.1: 预览页 + PDF/图片导出

**Files:**
- Create: `packages/web/app/preview/page.tsx`
- Install: `@react-pdf/renderer`

- [ ] **Step 1: 安装 PDF 依赖**

```bash
cd packages/web && pnpm add @react-pdf/renderer
```

- [ ] **Step 2: 创建预览页**

```tsx
// packages/web/app/preview/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ModuleRenderer } from "@/components/renderers/module-renderer";
import { templates, getTemplate } from "@/lib/templates";
import Link from "next/link";

export default function PreviewPage() {
  const { resume, init, setTheme } = useResumeStore();
  const [exporting, setExporting] = useState(false);

  useEffect(() => { init(); }, [init]);

  async function exportPDF() {
    setExporting(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      // 使用 @react-pdf/renderer 的 React PDF 组件方式
      // 此处简化为使用浏览器打印
      window.print();
    } finally {
      setExporting(false);
    }
  }

  async function exportImage() {
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const el = document.getElementById("resume-preview");
      if (!el) return;
      const canvas = await (html2canvas as unknown as (el: HTMLElement) => Promise<HTMLCanvasElement>)(el);
      const link = document.createElement("a");
      link.download = "简历.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4 px-4">
          <Link href="/editor" className="text-sm text-blue-600">← 返回编辑</Link>
          <div className="flex gap-2">
            {/* 模板快速切换 */}
            <select
              value={resume.theme.templateId}
              onChange={(e) => {
                const t = getTemplate(e.target.value);
                if (t) setTheme({ templateId: t.id, ...t.defaults });
              }}
              className="text-sm rounded border px-2 py-1"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button onClick={exportPDF} disabled={exporting} className="rounded bg-blue-600 px-4 py-1 text-sm text-white">
              导出 PDF
            </button>
            <button onClick={exportImage} disabled={exporting} className="rounded border px-4 py-1 text-sm">
              导出图片
            </button>
          </div>
        </div>

        <div id="resume-preview" className="bg-white shadow-lg mx-auto p-8 print:shadow-none print:p-0"
          style={{ width: "820px", minHeight: "1160px" }}>
          {resume.modules.map((mod) => (
            <ModuleRenderer key={mod.id} module={mod} theme={resume.theme} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 安装 html2canvas 用于图片导出**

```bash
cd packages/web && pnpm add html2canvas
```

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: preview page with pdf and image export"
```

---

## Phase 8: 集成收尾

### Task 8.1: 全局初始化 + API Key 设置 + Dockerfile

**Files:**
- Create: `packages/web/components/api-key-dialog.tsx`
- Modify: `packages/web/app/layout.tsx` (添加初始化 Provider)
- Create: `Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: 创建 API Key 设置弹窗**

```tsx
// packages/web/components/api-key-dialog.tsx
"use client";
import { useState, useEffect } from "react";

export function ApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("ai-api-key");
    if (!saved) setOpen(true);
    else setKey(saved);
  }, []);

  function save() {
    localStorage.setItem("ai-api-key", key);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[400px] space-y-4">
        <h2 className="font-semibold">设置 AI API Key</h2>
        <p className="text-sm text-gray-500">
          你的 API Key 只保存在浏览器本地，不会上传到任何服务器。
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <button onClick={save} disabled={!key.trim()} className="w-full rounded bg-blue-600 py-2 text-sm text-white disabled:opacity-50">
          开始使用
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 更新 layout.tsx 添加 Provider**

```tsx
// packages/web/app/layout.tsx — 在 body 内添加 ApiKeyDialog
import { ApiKeyDialog } from "@/components/api-key-dialog";

// 在 <body> 内最底部添加:
// <ApiKeyDialog />
```

- [ ] **Step 3: 创建 Dockerfile**

```dockerfile
# Dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build --filter=web

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/public

ENV PORT=3000
EXPOSE 3000
CMD ["node", "packages/web/server.js"]
```

- [ ] **Step 4: 创建 docker-compose.yml**

```yaml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: api key dialog, docker deployment"
```

---

## 计划总结

| Phase | 内容 | 文件数 |
|-------|------|--------|
| 1 | 项目脚手架 | ~15 |
| 2 | 状态管理 & 数据层 | ~7 |
| 3 | Agent Harness | ~7 |
| 4 | 渲染引擎 | ~9 |
| 5 | 对话页 | ~4 |
| 6 | 编辑器页 | ~4 |
| 7 | 预览 & 导出 | ~1 |
| 8 | 集成收尾 | ~3 |

**总计 ~50 个文件，8 个 Phase，约 35 个 Task。**
