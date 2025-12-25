# 基础镜像
FROM node:18-alpine AS builder

WORKDIR /app

# 安装依赖 - 使用与本地完全相同的版本
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@9.15.9 && pnpm install --frozen-lockfile

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