# 学生家长工作台 · 后端镜像
# Node 22 是硬要求：NestJS 12 的核心包是 ESM-only，运行时靠 Node 22 的 require(esm) 加载。

FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY entrypoint.sh ./
# 从 Windows 编辑保存可能带 CRLF，会让 sh 报 "not found"
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

USER node
EXPOSE 3000

ENTRYPOINT ["sh", "./entrypoint.sh"]
