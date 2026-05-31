FROM node:20-alpine AS deps
# Build inside sub-app directory to keep relative paths correct
WORKDIR /app/apps/merchant

# Copy manifests first
COPY apps/merchant/package*.json ./

# Ensure the monorepo base tsconfig is available for "extends"
COPY tsconfig.base.json /app/tsconfig.base.json

# Use reproducible install
RUN npm ci --legacy-peer-deps

# Build-time configuration for Vite (must start with VITE_)
ARG VITE_API_BASE_URL
ARG VITE_API_KEY
ARG VITE_SSO_ENABLED=0
ARG VITE_PASSWORD_LOGIN_ENABLED=0
ARG VITE_SELF_REGISTRATION_ENABLED=0
ARG VITE_RUNTIME_ENV_STRICT=true

# Expose as environment so Vite can read them during build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_KEY=${VITE_API_KEY}
ENV VITE_SSO_ENABLED=${VITE_SSO_ENABLED}
ENV VITE_PASSWORD_LOGIN_ENABLED=${VITE_PASSWORD_LOGIN_ENABLED}
ENV VITE_SELF_REGISTRATION_ENABLED=${VITE_SELF_REGISTRATION_ENABLED}
ENV VITE_RUNTIME_ENV_STRICT=${VITE_RUNTIME_ENV_STRICT}

# Copy source
COPY apps/merchant/ .
ENV NODE_ENV=production
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=deps /app/apps/merchant/dist /usr/share/nginx/html
COPY apps/merchant/nginx.conf /etc/nginx/nginx.conf
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
EXPOSE 8080
CMD ["nginx","-g","daemon off;"]
