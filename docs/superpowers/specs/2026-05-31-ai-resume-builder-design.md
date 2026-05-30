# AI 简历构建器 — 产品与技术设计文档

> 日期：2026-05-31
> 状态：设计阶段

## 一、产品定位

**一句话描述：** AI 对话驱动的开源简历构建工具，面向求职者自服务场景。

**核心交互：** 用户以对话方式描述自己的经历 → AI 生成完整简历 → 用户在可视化编辑器中精调 → 导出 PDF。

**开源策略：** MIT 协议，用户自带 API Key（BYOK），前端数据存 localStorage，零后端依赖。

## 二、用户与场景

- **主要用户：** 个人求职者，尤其是不擅长写简历的应届生和转行者
- **使用场景：** 打开浏览器 → 与 AI 对话描述经历 → 获得初稿 → 微调 → 导出
- **频次：** 偶发需求（每 1-3 年一次），因此零摩擦进入至关重要
- **不服务的用户：** 简历顾问/写手（需要多简历管理、客户管理——V2+ 考虑）

## 三、用户旅程

```
进入工具 → AI 对话采集信息 → AI 生成简历初稿 → 可视化精调 → 导出 PDF
                ↑                                      │
                └──── 不满意，继续对话修改 ──────────────┘
```

### 阶段 1：AI 对话采集

- 用户与 AI 自然对话，描述工作经历、教育背景、技能、项目等
- 支持粘贴 JD URL 或文本，AI 自动提取关键词并针对性优化
- 对话逐模块聚焦（工作经历 → 教育 → 技能 → 项目），用户可跳过
- 简历在侧边栏实时"生长"，形成正反馈

### 阶段 2：AI 生成初稿

- Plan-Driven Agent 流水线执行：分析输入 → 采集信息 → 生成内容 → 校验 → 呈现
- 输出受 JSON Schema 约束，确保数据结构正确
- 自动选择最匹配的模板和主题

### 阶段 3：可视化精调

- 模块拖拽排序
- 文字内联编辑
- 模板切换 + 主题变量调整（主色、字体、字号、间距）
- 增删模块
- Undo/Redo（Immer patches）

### 阶段 4：导出

- 主要格式：PDF（@react-pdf/renderer 纯前端生成）
- 次要格式：图片

## 四、功能边界（V1）

| 模块 | 做 | 不做 |
|------|-----|------|
| AI 对话 | 引导式问答、JD粘贴优化、流式输出 | 语音输入、多语言对话 |
| AI 生成 | Plan 流水线生成完整简历 | 多版本对比 |
| 可视化编辑 | 模块排序、文字编辑、模板切换、主题调整 | 自由定位(删除Absolute模式)、自定义CSS |
| 模板 | 3-5 套，主题变量可调 | 模板市场、用户上传 |
| 导出 | PDF、图片 | Word、JSON、在线分享 |
| 数据 | localStorage 单份简历 | 多简历、云端同步、版本历史 |
| 账户 | 不需要登录 | — |

## 五、数据模型

```typescript
// 一份简历 = 有序的模块列表 + 样式配置
interface Resume {
  id: string
  modules: Module[]
  theme: Theme
}

interface Module {
  id: string
  type: 'header' | 'summary' | 'work-experience' | 'education'
        | 'skills' | 'projects' | 'custom'
  order: number
  visible: boolean
  data: ModuleData
}

// 各模块 data 结构
interface HeaderData {
  name: string; jobTitle: string
  contacts: { icon: string; text: string; link?: string }[]
}
interface SummaryData { text: string }
interface WorkExperienceData {
  items: { company: string; position: string; startDate: string
           endDate?: string; description: string }[]
}
interface EducationData {
  items: { school: string; degree: string; major: string
           startDate: string; endDate?: string }[]
}
interface SkillsData {
  categories: { name: string; tags: string[] }[]
}
interface ProjectsData {
  items: { name: string; description: string; techStack: string[]; link?: string }[]
}
interface CustomData { title?: string; content: string }

// 主题 = 受限的视觉变量，不是自由 CSS
interface Theme {
  templateId: string
  primaryColor: string
  fontFamily: 'sans' | 'serif' | 'kai'
  fontSize: 'small' | 'medium' | 'large'
  spacing: 'compact' | 'normal' | 'loose'
}
```

## 六、系统架构

### 整体分层

```
┌──────────────────────────┐
│  Next.js 前端            │
│  ├── / (对话页)          │
│  ├── /editor (编辑器)    │
│  └── /preview (预览)     │
├──────────────────────────┤
│  Route Handlers          │
│  └── /api/agent/run      │ ← 调用 agent-harness
├──────────────────────────┤
│  agent-harness 包        │
│  ├── AgentRunner         │
│  ├── ToolRegistry        │
│  ├── LLMAdapter          │
│  └── StreamingBridge     │
├──────────────────────────┤
│  渲染引擎（纯前端）        │
│  ├── Module Renderers    │
│  └── Theme Engine        │
└──────────────────────────┘
```

### Monorepo 结构

```
packages/
├── agent-harness/        # 独立包，与框架无关
│   ├── runner.ts         # Plan 解析 + 步骤调度
│   ├── tool-registry.ts  # Tool 注册 + 执行
│   ├── llm-adapter/      # 多Provider适配
│   │   ├── types.ts
│   │   ├── anthropic.ts
│   │   ├── openai.ts
│   │   └── ollama.ts
│   ├── streaming.ts      # Runner → SSE 桥接
│   ├── schema/           # JSON Schema(Resume数据模型)
│   └── plans/
│       └── resume-generation.ts
│
├── web/                  # Next.js 应用
│   ├── app/
│   │   ├── page.tsx      # 对话页
│   │   ├── editor/       # 编辑器页
│   │   ├── preview/      # 预览页
│   │   └── api/agent/    # Route Handler
│   ├── components/
│   │   ├── chat/         # ChatPanel, MessageBubble
│   │   ├── editor/       # ModulePanel, ResumeCanvas, StylePanel
│   │   └── renderers/    # HeaderRenderer, WorkExpRenderer, ...
│   └── lib/
│       ├── stores/       # Zustand stores
│       └── templates/    # 模板 JSON 定义
│
└── shared/               # 前后端共享
    └── types/
        └── resume.ts     # Resume, Module, Theme 类型
```

### 状态管理

采用分层策略（参考 Reactive Resume）：

| 状态类型 | 方案 | 用途 |
|----------|------|------|
| 简历文档 | Zustand (+Immer) | 当前编辑的 Resume 数据 |
| 对话状态 | Zustand | 聊天消息列表、流式状态 |
| 编辑器 UI | useState/useReducer | 选中模块、面板开关 |
| 服务端缓存 | 不需要（V1 无服务端数据） | — |
| 持久化 | localStorage | 自动保存 |

### 模板系统

模板 = 纯 JSON 数据，不含渲染逻辑：

```json
{
  "id": "blue-simple",
  "name": "简洁蓝",
  "defaults": {
    "primaryColor": "#2563eb",
    "fontFamily": "sans",
    "fontSize": "medium",
    "spacing": "normal",
    "headerLayout": "split",
    "sectionDivider": "line"
  }
}
```

新增模板 = 新增 JSON 文件 + 预览图，无需写代码。

### Agent Harness 架构

Plan-Driven 执行模型：

```typescript
const resumeGenerationPlan: Plan = {
  id: "resume-generation",
  steps: [
    { id: "classify",  type: "tool",       tool: "classifyIntent" },
    { id: "collect",   type: "chat",       dependsOn: ["classify"] },
    { id: "generate",  type: "structured", dependsOn: ["collect"],
      schema: ResumeJsonSchema },
    { id: "validate",  type: "tool",       dependsOn: ["generate"],
      tool: "validateResume" },
    { id: "present",   type: "compose",    dependsOn: ["validate"] },
  ],
}
```

每步输出通过 Streaming Bridge → SSE → 前端 ChatPanel + ResumePreview 实时更新。

SSE 事件类型：

```typescript
type HarnessEvent =
  | { type: "plan:start"; planId: string }                      // Plan 开始执行
  | { type: "step:start"; stepId: string; description: string } // 步骤开始
  | { type: "step:chunk"; stepId: string; text: string }        // 流式文本块
  | { type: "step:done"; stepId: string; result: object }       // 步骤完成
  | { type: "step:tool_call"; stepId: string; tool: string; args: object } // 工具调用
  | { type: "plan:done"; resume: Resume }                       // Plan 完成，返回完整简历
  | { type: "plan:error"; stepId: string; error: string }       // 错误
```

Present 步骤负责将验证通过的结果组装为 `Resume` 对象，通过 `plan:done` 事件返回，前端接到后直接写入 Zustand store 并跳转到编辑器页面。

### LLM Provider 适配

支持的 Provider，通过统一接口切换：
- OpenAI (GPT-4)
- Anthropic (Claude)
- Google (Gemini)
- Ollama (本地模型)

## 七、技术栈

| 层 | 选型 | 理由 |
|---|------|------|
| 框架 | Next.js (App Router) | 全栈，Harness 跑在 Route Handler，生态成熟 |
| 前端 | React 19 + TypeScript | 生态最大，shadcn/ui 支持 |
| UI | Tailwind CSS + shadcn/ui | 开源标配，可定制 |
| 状态 | Zustand + Immer | 轻量，足够的客户端状态管理 |
| 拖拽 | @dnd-kit | React 生态最佳 |
| 表单 | React Hook Form（如需） | 轻量 |
| PDF | @react-pdf/renderer | 纯前端，React 组件式构建 |
| AI SDK | Vercel AI SDK（Gateway层） | 多Provider切换 |
| 构建 | pnpm + Turborepo | Monorepo 管理 |
| 部署 | Docker / Vercel | 用户自选 |

## 八、竞品定位

**主要差异：交互范式不同。**

| | Reactive Resume | 我们 |
|---|---|---|
| 交互 | 表单填写 → 预览 | AI 对话 → 生成 → 精调 |
| AI 角色 | 辅助增强 | 核心驱动 |
| 用户 | "我会写，帮我排版" | "我不会写，帮我生成" |
| 部署 | Docker (app+DB+printer) | Docker 单容器 或 Vercel |
| Stars | 31k | 0 |

**我们不是要取代 Reactive Resume，而是开创一个新的交互品类——对话式简历生成。**

**核心赌注：** Agent 流水线生成的简历质量能否达到用户只需微调的程度。

## 九、风险与假设

| 风险 | 缓解措施 |
|------|---------|
| AI 生成质量不达标 | Plan 中 validate 步骤做质量门禁；支持用户手动编辑兜底 |
| 对话式交互用户不习惯 | 同时提供 JD 粘贴快速通道 |
| Next.js Serverless 超时（Agent 运行时间长） | V1 简历生成应在 30s 内完成；后续可抽为独立服务 |
| @react-pdf/renderer 排版精度不足 | 必要时换 Puppeteer，但增加部署复杂度 |

## 十、当前项目迁移策略

当前 Vue 3 项目（Builder-For-Web）将完全重写。可保留的价值：

- 简历模块的设计理念（Header/WorkExperience/Education等）
- 数据模型的设计经验（attrDefined → 简化为 ModuleData）
- 模板切换+主题变量的交互模式
- Undo/redo 的 Immer 方案

不保留：

- Vue 技术栈 → 换 React/Next.js
- Absolute 自由定位模式 → 删除
- CSS 属性类层次 → 简化为结构化 ModuleData
- Pinia → Zustand
- Vuetify → shadcn/ui + Tailwind
- 后端 PDF 服务 → 前端 @react-pdf/renderer
