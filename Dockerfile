# 使用与本地相同的 Node 版本
FROM node:20.15.0-alpine AS builder

WORKDIR /app

# 安装依赖 - 使用 npm
COPY package.json package-lock.json ./
RUN npm ci

# 拷贝源码
COPY . .

# 构建项目
RUN npm run build

# 生产环境镜像
FROM node:20.15.0-alpine

WORKDIR /app

# 只复制必要的文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# 安装生产依赖
RUN npm ci --only=production

ENV NODE_ENV=production
EXPOSE 3001 
CMD ["node", "dist/main.js"]