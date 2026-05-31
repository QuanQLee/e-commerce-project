FROM node:20-alpine AS deps
# Work inside the sub-app folder so tsconfig path resolution works
WORKDIR /app/apps/storefront

# Ensure musl compatibility for Next.js SWC/Sharp when needed
RUN apk add --no-cache libc6-compat

# Copy only the manifests first for better layer caching
COPY apps/storefront/package*.json ./

# Also copy the monorepo base tsconfig so "extends: ../../tsconfig.base.json" resolves
COPY tsconfig.base.json /app/tsconfig.base.json

# Use a clean, reproducible install for CI/CD builds
RUN npm ci --legacy-peer-deps

# Copy source
COPY apps/storefront/ .

# Build-time public envs for client-side code
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_KEY
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_API_KEY=${NEXT_PUBLIC_API_KEY}

# Ensure public directory exists so the final COPY doesn't fail
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js app (output: standalone)
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Run the standalone server from the app directory
WORKDIR /app/apps/storefront
RUN addgroup --system --gid 10001 appgroup && \
    adduser --system --uid 10001 --ingroup appgroup appuser

# Copy standalone output and static assets
COPY --from=deps --chown=appuser:appgroup /app/apps/storefront/.next/standalone ./
COPY --from=deps --chown=appuser:appgroup /app/apps/storefront/.next/static ./.next/static
COPY --from=deps --chown=appuser:appgroup /app/apps/storefront/public ./public

EXPOSE 3000
USER appuser
CMD ["node","server.js"]
