FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Use a clean, reproducible install for CI/CD builds
RUN npm ci --legacy-peer-deps
COPY . .
# Ensure public directory exists so the final COPY doesn't fail
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/.next/standalone ./
COPY --from=deps /app/.next/static ./.next/static
COPY --from=deps /app/public ./public
EXPOSE 3000
CMD ["node","server.js"]
