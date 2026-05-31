# Builder For Web — Dockerfile
# 基于 Next.js standalone 输出模式构建，单容器部署

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build --filter=@ai-resume/web

FROM base AS runner
WORKDIR /app

# Next.js standalone 输出
COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "packages/web/server.js"]
