FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Build-time configuration for Vite (must start with VITE_)
ARG VITE_API_BASE_URL
ARG VITE_API_KEY
ARG VITE_AUTH_CLIENT_ID
ARG VITE_AUTH_CLIENT_SECRET
ARG VITE_AUTH_SCOPE

# Expose as environment so Vite can read them during build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_API_KEY=${VITE_API_KEY}
ENV VITE_AUTH_CLIENT_ID=${VITE_AUTH_CLIENT_ID}
ENV VITE_AUTH_CLIENT_SECRET=${VITE_AUTH_CLIENT_SECRET}
ENV VITE_AUTH_SCOPE=${VITE_AUTH_SCOPE}

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=deps /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
