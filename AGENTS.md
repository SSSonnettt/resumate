# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start all packages in dev mode (turbo dev, web on port 5001)
pnpm build        # Build all packages (turbo build)
pnpm lint         # Lint all packages (turbo lint)
pnpm check-types  # Type-check all packages (turbo check-types)
```

`pnpm` (v10.28+) is the package manager. The project uses Turborepo for task orchestration.

## Architecture

**AI Resume Builder** is an AI chat-driven open-source resume builder. The user describes their experience in natural language → AI generates a complete resume → fine-tune in a visual editor → export PDF/image.

### Monorepo structure (pnpm + Turborepo)

```
packages/
├── shared/              # Shared TypeScript types (pure types, zero deps)
├── agent-harness/       # Agent orchestration engine (framework-agnostic)
└── web/                 # Next.js 15 full-stack app (App Router)
```

**Tech stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Zustand + Immer, @dnd-kit, Anthropic SDK, html2canvas.

### Three routes (pages)

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Chat page — AI conversation (left) + mini resume preview (right) |
| `/editor` | `app/editor/page.tsx` | Visual editor — 3-panel: module panel + canvas + style panel |
| `/preview` | `app/preview/page.tsx` | Preview & export — PDF (browser print), PNG (html2canvas) |

### packages/shared — Type definitions

`src/resume.ts` defines all shared types used across packages:

- **Resume document model:** `Resume`, `Module`, `Theme`, `Template`
- **Module types:** `header`, `summary`, `work-experience`, `education`, `skills`, `projects`, `custom` — each with its own data interface (`HeaderData`, `WorkExperienceData`, etc.)
- **Agent harness events:** `HarnessEvent` — SSE event types for plan/step lifecycle (`plan:start`, `step:start`, `step:chunk`, `step:done`, `step:tool_call`, `plan:done`, `plan:error`)
- **Chat messages:** `ChatMessage` — `{ id, role, content, timestamp }`

### packages/agent-harness — Agent orchestration engine

Framework-agnostic package for running AI agent plans. Exports from `src/index.ts`:

- **`AgentRunner`** (`src/runner.ts`): Executes a `Plan` (ordered steps with dependencies). Steps can be:
  - `tool` — calls a registered tool function
  - `chat` — streams LLM text response
  - `structured` — LLM generates JSON matching a Zod schema
  - `compose` — assembles final result from previous step outputs
  - Each step yields `HarnessEvent` via async generator for SSE streaming.

- **`ToolRegistry`** (`src/tool-registry.ts`): Simple name→function map. `createBuiltInTools()` registers `classifyIntent` and `validateResume`.

- **`AnthropicProvider`** (`src/llm/anthropic.ts`): Implements `LLMProvider` interface with `streamChat()` (SSE stream via Anthropic SDK) and `generateStructured()` (JSON output via schema injection). Default model: `Codex-sonnet-4-6`.

- **`LLMProvider` interface** (`src/llm/types.ts`): Abstraction for swapping LLM providers. Methods: `streamChat(params, onChunk)` and `generateStructured<T>(params)`.

### packages/web — Next.js application

#### State management (Zustand + Immer)

Two stores in `lib/stores/`:

**`resume-store.ts`** — Core resume document store with full undo/redo:
- State: `resume` (Resume), `undoStack`/`redoStack` (Immer Patch arrays)
- Actions: `init` (load from localStorage), `setTheme`, `addModule`, `removeModule`, `reorderModules`, `updateModuleData`, `undo`, `redo`, `applyAIResult`
- Each mutation uses `produceWithPatches()` — captures inverse patches for undo. `applyAIResult` replaces entire resume and clears history.
- Auto-persists to localStorage key `resumate-data`.

**`chat-store.ts`** — Chat UI state:
- State: `messages` (ChatMessage[]), `isStreaming`, `harnessEvents`
- Actions: `addMessage`, `setStreaming`, `pushHarnessEvent`, `clearHarnessEvents`

#### Page: `/` — Chat page (`app/page.tsx`)

Two-panel layout:
1. **Left**: `ChatPanel` — message list + input, communicates with `/api/agent/run` via SSE
2. **Right**: `ResumePreviewMini` — scaled-down (0.45x) live preview of the resume

Components:
- `components/chat/chat-panel.tsx` — Main chat logic, SSE reader, dispatches events to both stores
- `components/chat/message-bubble.tsx` — User (blue) vs assistant (gray) message styling
- `components/chat/jd-input.tsx` — Toggleable textarea for pasting job descriptions

#### Page: `/editor` — Visual editor (`app/editor/page.tsx`)

Three-panel layout (classic builder pattern):
1. **Left sidebar (200px)**: `ModulePanel` — list existing modules with delete, add buttons for each module type
2. **Center canvas**: `ResumeCanvas` — 820px-wide white page with `@dnd-kit` drag-to-reorder, renders `ModuleRenderer` for each module
3. **Right sidebar (240px)**: `StylePanel` — template switcher, primary color picker, font/size/spacing selects

Toolbar: Back to chat link, undo/redo buttons, preview & export link.

#### Page: `/preview` — Preview & export (`app/preview/page.tsx`)

- Renders the full resume at 820px width on a white card
- Template quick-switch dropdown
- **Export PDF**: triggers `window.print()` (adds `print-mode` class to body)
- **Export Image**: uses `html2canvas` to capture `#resume-preview` element, downloads as PNG

#### Module renderers (`components/renderers/`)

Each module type has its own renderer component. All receive `{ data, theme }` props:

| Renderer | Module Type | Key Features |
|----------|------------|--------------|
| `header-renderer.tsx` | header | Name, job title, contact links — supports centered/split layout |
| `summary-renderer.tsx` | summary | Plain pre-wrap text |
| `work-exp-renderer.tsx` | work-experience | Company, position, date range, description |
| `education-renderer.tsx` | education | School, degree, major, date range |
| `skills-renderer.tsx` | skills | Categorized tag lists with colored labels |
| `projects-renderer.tsx` | projects | Project name, description, tech stack tags, link |
| `custom-renderer.tsx` | custom | Optional title + freeform content |

`module-renderer.tsx` is the router — switches on `module.type` to render the correct component. Returns null if `module.visible` is false.

`theme-engine.ts` converts a `Theme` object to CSS custom properties (`--primary-color`, `--font-family`, `--font-size`, `--spacing`).

#### Template system (`lib/templates/`)

Templates are pure JSON files:
- `blue-simple.json` — Split header, line divider, blue primary
- `classic-black.json` — Centered header, line divider, dark primary
- `elegant-serif.json` — Centered header, space divider, brown primary, serif font

`index.ts` exports a `templates` array and `getTemplate(id)` lookup function.

#### API route (`app/api/agent/run/route.ts`)

POST endpoint — accepts `{ messages, apiKey }` → creates `AnthropicProvider` + `AgentRunner` → executes a 5-step resume generation plan (`classify` → `collect` → `generate` → `validate` → `present`) → returns SSE stream of `HarnessEvent` objects.

The route uses Zod schemas (`ResumeSchema`, `ResumeModuleSchema`) for the `generate` step's structured output.

#### API Key dialog (`components/api-key-dialog.tsx`)

Modal that appears on first visit (if no key in localStorage). Stores Anthropic API key in `localStorage` key `ai-api-key`. Key is sent client-side with each agent request — never touches a server database.

### Undo/redo implementation detail

Every mutation in `resume-store.ts` follows this pattern:
1. `produceWithPatches(currentResume, draft => { mutate draft })` → returns `[nextState, patches, inversePatches]`
2. Push `inversePatches` onto `undoStack`, clear `redoStack`
3. Save `nextState` to localStorage

Undo: pop `inversePatches` from `undoStack` → `applyPatches(current, inverse)` → push inverse onto `redoStack`.
Redo: reverse of undo.

### Docker deployment

- `Dockerfile`: Multi-stage build (builder + runner) with standalone Next.js output
- `docker-compose.yml`: Single service on port 3000, `ANTHROPIC_API_KEY` from env

### Auto-generated files (do not edit)

- `packages/web/next-env.d.ts` — Next.js type declarations
- `packages/web/tsconfig.tsbuildinfo` — TypeScript incremental build cache
