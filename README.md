# Resumate

> AI 对话式开源简历生成器 — 用自然语言描述你的经历，AI 自动生成专业简历，可视化编辑器精细调整，一键导出 PDF/图片。

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/Next.js-15-black" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6" alt="TypeScript">
</p>

## ✨ 核心功能

- **🤖 AI 对话生成** — 和 AI 聊天描述你的经历，自动生成完整简历，支持粘贴 JD 优化针对性
- **🎨 可视化编辑器** — 三栏布局：模块面板 + 拖拽画布 + 样式面板，所见即所得
- **📄 多模板切换** — 经典黑、优雅衬线、蓝色简约等多种模板，一键切换
- **🔧 精细样式控制** — 主题色、字体族、字号、间距任意调整，实时预览
- **📥 双格式导出** — 浏览器原生打印导出 PDF，html2canvas 导出高清 PNG
- **↩️ 完整撤销/重做** — 基于 Immer Patch 的无限撤销重做，操作无忧
- **💾 本地存储** — 所有数据保存在浏览器 localStorage，不上传服务器，隐私安全

## 🚀 快速开始

```bash
# 克隆仓库
git clone git@github.com:SSSonnettt/resumate.git
cd resumate

# 安装依赖（需要 pnpm）
pnpm install

# 启动开发服务器
pnpm dev
```

浏览器访问 `http://localhost:5001`，输入你的 Anthropic API Key 即可开始使用。

> **前置条件**：Node.js 18+、pnpm 10+、Anthropic API Key（[获取地址](https://console.anthropic.com/)）

## 🛠 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 15 (App Router) + React 19 |
| 语言 | TypeScript 5.7 |
| 样式 | Tailwind CSS 3 |
| 状态管理 | Zustand + Immer |
| 拖拽 | @dnd-kit |
| AI | Anthropic SDK (Claude Sonnet 4) |
| 导出 | html2canvas / 浏览器 print |
| 构建 | Turborepo + pnpm workspace |

## 📁 项目结构

```
resumate/
├── packages/
│   ├── shared/              # 共享类型定义（Resume, Module, Theme 等）
│   ├── agent-harness/       # AI Agent 编排引擎（Plan/Step/SSE）
│   └── web/                 # Next.js 全栈应用
│       ├── app/
│       │   ├── page.tsx              # 首页 — AI 对话 + 缩略预览
│       │   ├── editor/page.tsx       # 编辑器 — 三栏布局
│       │   ├── preview/page.tsx      # 预览导出
│       │   └── api/agent/run/        # SSE Agent API
│       ├── components/
│       │   ├── chat/                 # 聊天面板
│       │   ├── editor/              # 编辑器组件
│       │   ├── renderers/           # 简历模块渲染器
│       │   └── ui/                  # 通用 UI 组件
│       └── lib/
│           ├── stores/              # Zustand 状态管理
│           ├── templates/           # 简历模板 JSON
│           └── resume/              # 简历操作工具函数
├── CLAUDE.md                # Claude Code 项目指引
└── turbo.json               # Turborepo 配置
```

## 🧩 简历模块

| 模块 | 说明 |
|------|------|
| Header | 姓名、职位、联系方式 |
| Summary | 个人简介 |
| Work Experience | 工作经历（公司、职位、时间、描述） |
| Education | 教育背景（学校、学位、专业） |
| Skills | 技能标签（分类展示） |
| Projects | 项目经历（名称、描述、技术栈） |
| Custom | 自定义模块 |

## 🐳 Docker 部署

```bash
docker compose up -d
```

服务运行在 `http://localhost:3000`。

## 📄 License

[MIT](LICENSE)
