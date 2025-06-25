FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
# Install both dependencies and devDependencies even though the base image sets
# NODE_ENV=production. The build step requires @types/node for the Vite config
# and other TypeScript tooling.
RUN npm install --omit=dev=false
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_API_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_KEY=$VITE_API_KEY
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
