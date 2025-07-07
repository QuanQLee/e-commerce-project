# ---------- 基础镜像 ----------
FROM node:20-slim AS deps

# ---------- 复制依赖清单 ----------
WORKDIR /app
COPY package.json ./

# ---------- 安装依赖 ----------
# 1. 先把 npm 升级到最新（>= 11，可自动处理很多 peer-dependency 提示）
# 2. 再安装依赖，并使用 --legacy-peer-deps 跳过 React 19 与 testing-library 的冲突
RUN npm install -g npm@latest \
 && npm install --legacy-peer-deps

# ---------- 拷贝源码 ----------
COPY . .

# ---------- 构建前端 ----------
# 这里以 Vite 为例：把产物输出到 /app/dist
RUN npm run build

# ---------- 生产镜像 ----------
FROM nginx:1.27-alpine
COPY --from=deps /app/dist /usr/share/nginx/html
# 可选：自定义 nginx.conf
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
