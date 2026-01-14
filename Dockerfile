# --- 阶段 1: 构建阶段 ---
FROM node:20.15.0-alpine AS builder

# 设置 pnpm 环境变量
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# 启用 corepack 以使用内置 pnpm 或通过 npm 安装
RUN npm install -g pnpm@latest --registry=https://registry.npmmirror.com

WORKDIR /app

# 1. 只拷贝依赖定义文件
COPY package.json pnpm-lock.yaml ./

# 2. 安装依赖 (使用 --frozen-lockfile 确保与 lock 文件一致)
# 使用阿里镜像源加速
RUN pnpm install --frozen-lockfile --registry=https://registry.npmmirror.com

# 3. 拷贝源码并构建
COPY . .
COPY envs ./envs
RUN pnpm run build

# 4. 【关键优化】清理开发依赖，只保留生产环境必需的包
# 这会极大地缩小 node_modules 的体积
RUN pnpm prune --prod

# --- 阶段 2: 运行阶段 ---
FROM node:20.15.0-alpine

WORKDIR /app

# 设置生产环境标识
ENV NODE_ENV=test

# 1. 从构建阶段拷贝编译后的代码和精简后的 node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/envs ./envs
# 2. 暴露端口 (根据你的 NestJS 配置，通常是 3000 或 3001)
EXPOSE 3002

# 3. 启动应用
# 注意：NestJS 编译产物入口通常是 dist/main.js
CMD ["node", "dist/main.js"]