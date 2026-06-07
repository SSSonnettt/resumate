# Resumate 四步向导交互重设计

> 日期：2026-06-08
> 状态：设计完成

## 一、设计目标

将现有的三页面独立架构（`/` 聊天 → `/editor` 编辑 → `/preview` 预览）合并为单一向导式页面，用户在同一步骤中聚焦当前任务，通过左右滑动/按钮在步骤间切换。

**核心原则：** 每一步聚焦一件事。AI 驱动流程推进，用户保持控制权。

## 二、四步流程

| 步骤 | 状态值 | 名称 | 界面 | 触发方式 |
|------|--------|------|------|----------|
| 1 | `chat` | 聊天收集 | 左：引导对话 / 右：信息清单 | 初始状态 |
| 2 | `generating` | AI 生成 | 日志流视图 + 阶段进度 | 用户确认后触发 |
| 3 | `editing` | 可视化编辑 | 现有三栏编辑器（复用） | AI 生成完成后自动推进 |
| 4 | `preview` | 预览导出 | 简历预览 + 导出面板 | 用户手动点击 |

## 三、状态机

### 核心变量

```typescript
type Step = 'chat' | 'generating' | 'editing' | 'preview'
```

向导只有一个 `step` 变量，改变 step 即切换页面内容（framer-motion 左右滑动动画）。

### 转移规则

| 方向 | 从 | 到 | 触发方式 |
|------|----|----|----------|
| ➡️ 前进 | chat | generating | 信息收集完成，用户点击"开始生成" |
| ➡️ 自动 | generating | editing | AI 生成完成（`plan:done` 事件） |
| ➡️ 前进 | editing | preview | 用户点击"预览导出" |
| ⬅️ 回退 | 任意 | 上一步 | 用户点击"上一步"或左滑 |
| 🔗 跳转 | 任意 | 已完成步骤 | 点击顶部步骤指示器中已完成的步骤 |

**禁止**：
- chat → editing（跳过生成）
- chat → preview（跳过生成+编辑）
- generating → preview（跳过编辑）

### 回退行为

回退保留当前步骤状态。例如：步骤3编辑中回退到步骤2，再前进到步骤3，编辑内容不丢失。

## 四、数据流

```
WizardStore (步骤状态、收集清单、生成阶段) [新增]
     │
     ├──▶ ChatStore (对话消息) [现有，不动]
     │
     ├──▶ ResumeStore (简历数据 + undo/redo) [现有，不动]
     │
     └──▶ 步骤1 AI 写入 ChatStore
          步骤2 AI 写入 ResumeStore (plan:done)
          步骤3 编辑 → 更新 ResumeStore
          步骤4 预览 → 只读 ResumeStore
```

- **WizardStore** — 新增，管理 step、completedSteps、collectedItems、isGenerating
- **ChatStore** — 不动，继续管理消息列表和 harnessEvents
- **ResumeStore** — 不动，继续管理简历数据和 undo/redo

## 五、组件树

```
app/wizard/page.tsx          [新增路由]
├── WizardShell              [新增组件]
│   ├── StepIndicator        [新增] 顶部步骤圆点，已完成可点击
│   ├── AnimatePresence      framer-motion 滑动容器
│   │   ├── <ChatStep />     step === 'chat'
│   │   │   ├── ChatPanel        [复用] 左侧对话
│   │   │   │   ├── MessageBubble [复用]
│   │   │   │   └── JdInput      [复用]
│   │   │   └── InfoChecklist    [新增] 右侧信息清单
│   │   ├── <GeneratingStep />   step === 'generating'
│   │   │   └── LogStreamView    [新增] 日志流 + 阶段进度
│   │   ├── <EditingStep />      step === 'editing'
│   │   │   ├── ModulePanel      [复用]
│   │   │   ├── ResumeCanvas     [复用]
│   │   │   │   └── ModuleRenderer ×7 [复用]
│   │   │   └── StylePanel       [复用]
│   │   └── <PreviewStep />      step === 'preview'
│   │       ├── ResumePreview    [复用 ModuleRenderer]
│   │       └── ExportSidebar    [复用现有导出逻辑]
│   └── NavigationBar        [新增] 底部前进/回退按钮
```

### 组件复用清单

| 处理方式 | 组件 |
|----------|------|
| 直接复用 | ChatPanel、MessageBubble、JdInput、ModulePanel、ResumeCanvas、StylePanel、ModuleRenderer ×7、ApiKeyDialog |
| 新增 | WizardShell、StepIndicator、InfoChecklist、LogStreamView、NavigationBar |
| 移除 | ResumePreviewMini（迷你预览 → 改为信息清单） |
| 不动 | ChatStore、ResumeStore、模板系统、theme-engine、SSE 路由 |

## 六、动画策略

### 步骤切换

```tsx
<AnimatePresence mode="wait" custom={direction}>
  <motion.div
    key={step}
    custom={direction}
    initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
  >
    {stepContent}
  </motion.div>
</AnimatePresence>
```

- `direction > 0`（前进）：新页面从右滑入，旧页面向左滑出
- `direction < 0`（回退）：新页面从左滑入，旧页面向右滑出

### 步骤指示器

步骤圆点用 framer-motion `layoutId` 做共享位移动画——蓝色高亮圆点平滑移动到当前步骤。

## 七、路由迁移

| 旧路由 | 新行为 |
|--------|--------|
| `/` | redirect (301) → `/wizard?step=chat` |
| `/editor` | redirect (301) → `/wizard?step=editing` |
| `/preview` | redirect (301) → `/wizard?step=preview` |
| `/wizard` | **新增**，主页面 |

旧路由做 301 永久重定向保持兼容。

## 八、各步骤详细设计

### 步骤 1：聊天收集 (chat)

**布局**：左栏 flex:1 聊天 + 右栏 280px 信息清单

**AI 引导对话**：
- 系统提示词注入：AI 按顺序引导收集 6 项信息（基本信息 → 工作经历 → 教育背景 → 技能标签 → 项目经历 → 自我评价）
- AI 主动发问，用户自然回答
- 用户可一次性提供多项信息，AI 识别并标记
- 用户可回复"跳过"跳过某项

**信息清单**（InfoChecklist）：

| 序号 | 信息项 | 状态 |
|------|--------|------|
| 1 | 基本信息 | ⏳ 待收集 / ✅ 已收集 / ⏭️ 已跳过 |
| 2 | 工作经历 | 同上 |
| 3 | 教育背景 | 同上 |
| 4 | 技能标签 | 同上 |
| 5 | 项目经历 | 同上 |
| 6 | 自我评价 | 同上 |

- AI 每收集完一项，通过 tool call 事件通知前端勾选
- 底部显示收集进度条（x/6）
- 全部收集完成（或跳过）后，底部出现"✨ 开始生成简历"按钮

**JD 粘贴**：保留现有 JdInput 组件。粘贴 JD 后 AI 提取关键词并针对性提问。

### 步骤 2：AI 生成 (generating)

**布局**：全宽居中（max-w-2xl），视觉聚焦

**日志流视图**（LogStreamView）：
- 读取 `ChatStore.harnessEvents`，渲染流式日志
- 每行带阶段 emoji 图标（✅ 🔄 ⏳ ❌）
- 流式文本逐行追加，自动滚动到底部

**阶段进度指示**：
- 顶部 5 个 pill 标签：识别需求 → 整理信息 → 生成简历 → 校验结构 → 准备编辑
- 当前阶段 pill 高亮蓝色 + 脉冲动画
- 已完成阶段显示绿色勾选

**异常处理**：
- 生成失败：红色错误信息 + "重试"按钮 + "返回步骤1补充信息"链接
- 超时：60 秒超时，显示超时提示 + 重试
- 数据校验失败：AI 自动修复重试（最多 2 次），仍失败则呈现部分结果

**触发下一步**：`plan:done` 事件返回 Resume → 写入 ResumeStore → 自动跳转步骤3

### 步骤 3：可视化编辑 (editing)

**布局**：复用现有三栏 — ModulePanel(240px) | ResumeCanvas(1fr) | StylePanel(360px)

**改动**：
- 去掉原 editor header（"返回工作台"、"预览导出"链接）
- undo/redo 移到 wizard 顶部导航栏
- wizard 的上下步按钮替代原有导航

**移动端适配**：小屏幕改为单栏 — Canvas 满宽，ModulePanel 和 StylePanel 变为底部抽屉面板

**触发下一步**：用户点击底部"下一步"按钮

### 步骤 4：预览导出 (preview)

**布局**：中栏 820px 宽简历预览 + 右栏 260px 导出面板

**功能**（纯预览 + 导出，不做编辑）：
- 简历全尺寸预览（复用 ModuleRenderer）
- 模板下拉切换（只影响预览，不影响编辑状态）
- 导出 PDF：`window.print()`
- 导出图片：`html2canvas`

## 九、异常处理

| 异常场景 | 处理方式 |
|----------|----------|
| 步骤1：无 API Key | ApiKeyDialog 弹窗（复用），关闭前禁用输入 |
| 步骤2：生成失败 | 红色日志 + 重试 + 回退链接，不丢失对话内容 |
| 步骤2：生成超时 | 60s 超时 → 提示 + 重试 |
| 步骤2→3：数据校验失败 | 自动修复重试 ×2 → 部分结果 + 手动编辑兜底 |
| 步骤3：编辑中途刷新 | localStorage 持久化，刷新恢复 |
| 步骤4：打印取消 | 浏览器原生行为，不影响页面 |
| 移动端：编辑器 | 三栏 → 单栏 + 底部抽屉 |
| 步骤1→3：空简历 | 显示空状态提示"请先完成对话收集" |

## 十、V1 不做

- 浏览器前进/后退按钮与步骤同步
- WizardStore 持久化（标签页关闭后需重新开始）
- 多简历管理
- 国际化（仅中文）

## 十一、文件变更清单

```
packages/web/
├── app/
│   ├── wizard/
│   │   └── page.tsx              [新增] Wizard 主页面
│   ├── page.tsx                  [修改] redirect → /wizard
│   ├── editor/page.tsx           [修改] redirect → /wizard?step=editing
│   └── preview/page.tsx          [修改] redirect → /wizard?step=preview
├── components/
│   └── wizard/
│       ├── wizard-shell.tsx      [新增] 顶层容器
│       ├── step-indicator.tsx    [新增] 步骤指示器
│       ├── navigation-bar.tsx    [新增] 底部导航
│       ├── chat-step.tsx         [新增] 步骤1容器
│       ├── info-checklist.tsx    [新增] 信息清单
│       ├── generating-step.tsx   [新增] 步骤2容器
│       ├── log-stream-view.tsx   [新增] 日志流
│       ├── editing-step.tsx      [新增] 步骤3容器（复用编辑器组件）
│       └── preview-step.tsx      [新增] 步骤4容器
└── lib/
    └── stores/
        └── wizard-store.ts       [新增] WizardStore
```
