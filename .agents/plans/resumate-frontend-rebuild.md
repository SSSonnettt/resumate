# Resumate 前端重构方案

## 1. Context — 为什么需要这次重构

### 1.1 现状诊断

当前 `packages/web` 存在以下架构性问题：

**A. 单主题锁定** — `globals.css` 中所有 CSS 变量仅在 `:root` 下定义，`layout.tsx` 硬编码 `dark` class，整个设计系统锁死在深色模式。所有组件中使用 `bg-white/[0.01]`、`bg-[hsl(240,10%,3%)]` 等硬编码深色值超过 50 处。

**B. 玻璃组件硬编码** — `glass-panel`、`glass-pill`、`double-bezel-outer` 等全部使用 `rgba(0 0 0 / ...)` 做阴影、`hsl(240 8% 100% / ...)` 做边框高光，浅色模式下完全不可用。

**C. 动画强度不足** — 目标 MOTION_INTENSITY 为 9（大胆/电影级），但实际仅 5-6 水平：步骤切换仅简单 fade+blur，`lib/motion.ts` 仅 4 种简单 variants，辉光仅呼吸循环。

**D. 组件内联样式泛滥** — `bg-[hsl(240,10%,3%)]`、`bg-[hsl(240,8%,4%)]` 等写法遍布组件。

### 1.2 重构目标

| 维度 | 当前状态 | 目标状态 |
|------|---------|---------|
| 主题 | 仅深色 | 深/浅双主题，跟随 `prefers-color-scheme` |
| CSS 变量 | 仅 `:root` 一层 | `:root`(light) + `.dark` 双层，语义化命名 |
| 动画 | 精炼微交互 (5-6) | 大胆电影级 (9)，多阶段编排 + spring physics |
| 玻璃组件 | 硬编码深色 | 主题感知，CSS 变量驱动 |
| 视觉密度 | 4 | 保持 4，浅色下提升对比度 |
| 布局变化 | 7 | 保持 Ethereal Glass 基调 + 增加视觉变化 |

---

## 2. CSS 变量系统重构

### 2.1 文件结构

```
packages/web/app/
├── globals.css              → 仅保留 @tailwind directives + @import + 全局 reset
├── styles/
│   ├── tokens/
│   │   ├── colors-light.css   # 浅色主题语义色 (:root)
│   │   ├── colors-dark.css    # 深色主题语义色 (.dark)
│   │   ├── spacing.css        # 间距/圆角/字重/Z-index（主题无关）
│   │   └── glass.css          # Ethereal Glass 材质变量（:root + .dark 双层）
│   ├── components/
│   │   ├── glass-panels.css   # .glass-panel / .glass-pill / .double-bezel
│   │   ├── orbs.css           # 径向辉光球
│   │   └── noise.css          # Noise 纹理
│   └── animations/
│       ├── keyframes.css      # Tailwind 用 keyframes
│       └── transitions.css    # 全局 transition
```

### 2.2 核心变量变化

**边框系统** — 深色用亮透明度，浅色用暗透明度：
- `--border`: 深色 `240 8% 100% / 0.05` → 浅色 `240 5% 0% / 0.08`
- `--divider`: 新增，统一分隔线颜色
- `--glass-border` / `--glass-border-hover` / `--glass-highlight` / `--glass-shadow`

**玻璃材质** — 新增 `--glass-bg` / `--glass-bg-raised` / `--glass-shadow` / `--glass-shadow-raised`，深浅双值。

### 2.3 主题切换机制

- `app/layout.tsx` 移除硬编码 `dark` class
- 添加防 FART (Flash of inAccurate Theme) 内联 `<script>`
- 新增 `lib/theme-sync.ts`：通过 `matchMedia('(prefers-color-scheme: dark)')` 实时监听系统主题切换

---

## 3. 布局架构重构

### 3.1 WizardShell (`components/wizard/wizard-shell.tsx`)

- 浮动导航栏改用 `glass-pill` CSS 类（由 CSS 变量驱动，双主题自适应）
- 侧边栏 Double-Bezel 全面改用 `--sidebar-background` / `--glass-bg`
- 主内容区背景由 CSS 变量控制

### 3.2 ChatStep (`components/wizard/chat-step.tsx`)

- 右侧 Double-Bezel 面板全部改用 CSS 变量
- `border-white/[0.06]` → `border-[hsl(var(--glass-border))]`

### 3.3 GeneratingStep (`components/wizard/generating-step.tsx`)

- 底部状态栏 `border-t border-white/[0.06] bg-white/[0.02]` → `border-[hsl(var(--divider))] bg-[hsl(var(--glass-bg))]`
- 进度条容器 → `bg-[hsl(var(--muted))]`

### 3.4 EditingStep (`components/wizard/editing-step.tsx`)

- 右侧操作面板 Double-Bezel 改用变量：`bg-[hsl(240,10%,3%)]` → `bg-[hsl(var(--sidebar-background))]`
- 折叠按钮 hover 态适配双主题

### 3.5 全局布局 (`app/layout.tsx`)

- 移除 `dark` class 硬编码
- 辉光球 `.orb-violet/.orb-emerald/.orb-gold` 在浅色下降低 opacity

---

## 4. 动画系统升级

### 4.1 `lib/motion.ts` 扩展

新增变体：
- `pageTransitionVariants`: 多阶段编排 (enter→center→exit)，带 scale+blur 电影级缓出
- `listItemVariants`: 基于 index 的物理弹簧 (stiffness/damping/mass) + 空间偏移
- `glowSweepVariants`: 辉光扫描 idle/hover 态

### 4.2 `tailwind.config.ts` 新增关键帧

- `glow-sweep`: 辉光扫描（左→右光线）
- `border-rotate`: 边框光线追踪
- `particle-float`: 粒子浮动效果

### 4.3 组件动画升级

- **WizardShell 页面切换**: 从简单 fade+blur → 多阶段编排 (y位移+scale+blur+子元素级联)
- **InfoChecklist 列表入场**: 从简单 spring → 物理弹簧 + index偏移
- **StepIndicator 连接线**: 从静态渐变 → 流动动画
- **MessageBubble 入场**: 升级入场动画

---

## 5. 组件级视觉重设计

每个关键组件的颜色硬编码替换为 CSS 变量引用：

| 组件 | 文件 | 关键变更 |
|------|------|---------|
| ConversationSidebar | `conversation-sidebar.tsx` | 全部硬编码 → 变量，外层bezel用`--glass-bg`，内层用`--sidebar-background` |
| ChatPanel | `chat-panel.tsx` | 输入框玻璃药丸 `bg-[hsl(240,8%,4%)]` → `bg-[hsl(var(--card))]` |
| MessageBubble | `message-bubble.tsx` | AI气泡 `bg-white/[0.01]` → `bg-[hsl(var(--card))] border-[hsl(var(--border))]` |
| InfoChecklist | `info-checklist.tsx` | 边框/进度条背景 → `--divider` / `--muted` |
| LogStreamView | `log-stream-view.tsx` | 卡片边框 `border-white/[0.06]` → `border-[hsl(var(--border))]` |
| StepIndicator | `step-indicator.tsx` | 连接线 → `bg-[hsl(var(--divider))]` |
| ResumeCanvas | `resume-canvas.tsx` | 容器背景适配，空状态提示 |
| PreviewStep | `preview-step.tsx` | (如被引用) 同 EditingStep 的变量替换 |

---

## 6. 迁移策略（分 5 个 Phase）

### Phase 0: CSS 文件拆分（零视觉变化）
1. 创建 `app/styles/` 目录结构
2. 将现有 CSS 变量拆分为 tokens / components / animations
3. `globals.css` 改用 `@import`
4. `layout.tsx` 添加 FART 内联脚本（保持 `dark` class 硬编码）

### Phase 1: 组件变量替换（零视觉变化）
1. 逐组件将所有硬编码颜色替换为 CSS 变量引用
2. 优先级: ConversationSidebar → EditingStep → ChatPanel → LogStreamView → 其他
3. 每替换一个组件立即验证

### Phase 2: 浅色主题变量定义
1. 创建 `colors-light.css`，定义完整浅色变量集
2. 深色变量移入 `colors-dark.css` 的 `.dark` 选择器
3. `layout.tsx` 启用 `prefers-color-scheme` 检测

### Phase 3: 浅色模式视觉修复
1. 逐步骤在浅色下测试修复：chat → generating → editing
2. 玻璃组件阴影/透明度修复
3. WCAG AA 对比度审计

### Phase 4: 动画系统升级
1. 扩展 `lib/motion.ts` 和 `tailwind.config.ts`
2. 升级各组件动画

### Phase 5: 精修和测试
1. 全面双主题测试 + 动效性能 + 无障碍审核

---

## 7. 验证方案

### 7.1 视觉验证
- 每个 Phase 完成后手动检查 3 步骤 × 2 主题 × 关键状态
- WCAG AA 对比度审计（正文 ≥ 4.5:1，大字 ≥ 3:1）

### 7.2 功能回归
- 聊天输入和 SSE 流式响应
- 信息清单实时更新
- 步骤切换 + AI 管线生成
- 简历画布渲染 + dnd-kit 拖拽
- PDF/PNG 导出 + 浏览器打印
- 会话创建/切换/删除 + localStorage 持久化

### 7.3 动效验收
- 页面切换 < 1s 完成，60fps 稳定
- `prefers-reduced-motion: reduce` 时禁用非必要动画

---

## 附录：文件变更汇总

| 文件 | 变更 | 说明 |
|------|------|------|
| `app/globals.css` | 重写 | 缩减为 import-only |
| `app/styles/**/*.css` | 新增 8+ | CSS 变量和组件类拆分 |
| `app/layout.tsx` | 修改 | 移除硬编码 dark，FART 脚本 |
| `lib/motion.ts` | 扩展 | 新增 5+ 组 variants |
| `lib/theme-sync.ts` | 新增 | 主题检测和同步 |
| `tailwind.config.ts` | 扩展 | 新增动画关键帧 |
| `components/wizard/wizard-shell.tsx` | 修改 | 页面切换动画升级 |
| `components/wizard/conversation-sidebar.tsx` | 重写样式 | 全部变量化 |
| `components/wizard/chat-step.tsx` | 修改 | Double-Bezel 变量化 |
| `components/wizard/generating-step.tsx` | 修改 | 状态栏变量化 |
| `components/wizard/editing-step.tsx` | 修改 | 面板变量化 |
| `components/wizard/step-indicator.tsx` | 修改 | 连接线流动动画 |
| `components/wizard/info-checklist.tsx` | 修改 | 列表入场升级 |
| `components/chat/chat-panel.tsx` | 修改 | 输入框变量化 |
| `components/chat/message-bubble.tsx` | 修改 | 气泡变量化 |
| `components/wizard/log-stream-view.tsx` | 修改 | 卡片边框变量化 |
