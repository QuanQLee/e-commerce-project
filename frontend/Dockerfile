# ---------- Base image ----------
FROM node:20-slim AS deps

# ---------- Copy dependency manifest ----------
WORKDIR /app
COPY package.json package-lock.json ./

# ---------- Install dependencies ----------
# 1. Upgrade npm to the latest version (>= 11) to handle most peer dependency warnings automatically
# 2. Install dependencies with --legacy-peer-deps to skip React 19/testing-library conflicts
RUN npm install -g npm@latest \
 && npm ci --legacy-peer-deps

# ---------- Build-time environment ----------
ARG VITE_API_BASE_URL
ARG VITE_API_KEY
ARG VITE_RUNTIME_ENV_STRICT=false
ARG VITE_SSO_ENABLED=0
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_KEY=${VITE_API_KEY}
ENV VITE_RUNTIME_ENV_STRICT=${VITE_RUNTIME_ENV_STRICT}
ENV VITE_SSO_ENABLED=${VITE_SSO_ENABLED}

# ---------- Copy source code ----------
COPY . .
ENV NODE_ENV=production

# ---------- Build frontend ----------
RUN npm run build

# ---------- Production image ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=deps /app/dist /usr/share/nginx/html
# Use full nginx.conf (contains worker_processes/http/server). It must be copied
# to /etc/nginx/nginx.conf, not conf.d/default.conf.
COPY nginx.conf /etc/nginx/nginx.conf

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
