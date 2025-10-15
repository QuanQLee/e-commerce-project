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
ARG VITE_AUTH_CLIENT_ID
ARG VITE_AUTH_CLIENT_SECRET
ARG VITE_AUTH_SCOPE
ARG VITE_SSO_ENABLED=0
ARG VITE_RUNTIME_ENV_STRICT=true

# Expose as environment so Vite can read them during build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_KEY=${VITE_API_KEY}
ENV VITE_AUTH_CLIENT_ID=${VITE_AUTH_CLIENT_ID}
ENV VITE_AUTH_CLIENT_SECRET=${VITE_AUTH_CLIENT_SECRET}
ENV VITE_AUTH_SCOPE=${VITE_AUTH_SCOPE}
ENV VITE_SSO_ENABLED=${VITE_SSO_ENABLED}
ENV VITE_RUNTIME_ENV_STRICT=${VITE_RUNTIME_ENV_STRICT}

# Copy source
COPY apps/merchant/ .
ENV NODE_ENV=production
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=deps /app/apps/merchant/dist /usr/share/nginx/html
COPY apps/merchant/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
