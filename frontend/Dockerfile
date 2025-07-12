# ---------- Base image ----------
FROM node:20-slim AS deps

# ---------- Copy dependency manifest ----------
WORKDIR /app
COPY package.json ./

# ---------- Install dependencies ----------
# 1. Upgrade npm to the latest version (>= 11) to handle most peer dependency warnings automatically
# 2. Install dependencies with --legacy-peer-deps to skip React 19/testing-library conflicts
RUN npm install -g npm@latest \
 && npm install --legacy-peer-deps

# ---------- Copy source code ----------
COPY . .

# ---------- Build frontend ----------
# With Vite this places output in /app/dist
RUN npm run build

# ---------- Production image ----------
FROM nginx:1.27-alpine
COPY --from=deps /app/dist /usr/share/nginx/html
# Optional: custom nginx.conf
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
