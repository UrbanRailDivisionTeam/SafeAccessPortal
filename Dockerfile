# 使用官方 Node.js 18 Alpine 镜像作为基础镜像
FROM node:18-alpine AS base

# 安装依赖阶段
FROM base AS deps
# 检查 https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# 了解为什么可能需要 libc6-compat
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 安装依赖基于首选的包管理器
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables for configuration system
ARG WORK_TYPE_OPTIONS=quality_rework,product_work,maintenance,inspection,other
ARG DANGER_TYPE_OPTIONS=high_altitude,confined_space,hot_work,electrical,chemical,radiation,lifting,excavation
ARG WORK_BASIS_OPTIONS=ncr,design_change,nonconformity,maintenance_plan,inspection_plan
ARG DEPARTMENT_OPTIONS=quality,production,maintenance,engineering,safety,administration
ARG POSITION_OPTIONS=engineer,technician,supervisor,manager,operator,inspector

ENV WORK_TYPE_OPTIONS=$WORK_TYPE_OPTIONS
ENV DANGER_TYPE_OPTIONS=$DANGER_TYPE_OPTIONS
ENV WORK_BASIS_OPTIONS=$WORK_BASIS_OPTIONS
ENV DEPARTMENT_OPTIONS=$DEPARTMENT_OPTIONS
ENV POSITION_OPTIONS=$POSITION_OPTIONS

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED 1

# 构建应用
RUN npm run build

# 生产镜像，复制所有文件并运行 Next.js
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建日志目录
RUN mkdir -p /app/logs && chmod 755 /app/logs

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public

# 设置正确的权限并利用输出跟踪来减少镜像大小
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 设置日志目录权限
RUN chown -R nextjs:nodejs /app/logs

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "server.js"]