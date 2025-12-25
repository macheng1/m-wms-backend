# 基础镜像
FROM node:18-alpine AS builder

WORKDIR /app

# 安装依赖 - 指定兼容的 pnpm 版本
COPY package.json pnpm-lock.yaml ./
# 方案1A：指定到具体小版本
RUN npm install -g pnpm@8.15.9 && pnpm install --frozen-lockfile
# 或方案1B：只指定大版本
# RUN npm install -g pnpm@8 && pnpm install --frozen-lockfile
# 或方案1C：通过 pnpm 自己安装（更稳定）
# RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 拷贝源码
COPY . .

# 构建项目
RUN pnpm run build

# 生产环境镜像
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=deployment

EXPOSE 3001 

CMD ["node", "dist/main.js"]