# ---------- Base image ----------
FROM node:20-slim AS deps

# ---------- Copy dependency list ----------
WORKDIR /app
COPY package.json ./

# ---------- Install dependencies ----------
# 1. First upgrade npm to the latest version (>= 11) so it handles many peer-dependency warnings
# 2. Then install packages using --legacy-peer-deps to avoid conflicts with React 19 and testing-library
RUN npm install -g npm@latest \
 && npm install --legacy-peer-deps

# ---------- Copy source code ----------
COPY . .

# ---------- Build frontend ----------
# Here using Vite as an example: output artifacts to /app/dist
RUN npm run build

# ---------- Production image ----------
FROM nginx:1.27-alpine
COPY --from=deps /app/dist /usr/share/nginx/html
# Optional: custom nginx.conf
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
