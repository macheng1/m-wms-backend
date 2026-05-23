FROM node:20.15.0-alpine AS deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN npm install -g pnpm@9.15.9 --registry=https://registry.npmmirror.com

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --registry=https://registry.npmmirror.com

FROM node:20.15.0-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN npm install -g pnpm@9.15.9 --registry=https://registry.npmmirror.com

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p envs && pnpm run build && pnpm prune --prod

FROM node:20.15.0-alpine AS runner

WORKDIR /app

ENV NODE_ENV=development
ENV PORT=3001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/envs ./envs

EXPOSE 3001

CMD ["node", "dist/main.js"]
