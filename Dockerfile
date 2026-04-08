# Stage 1: Build the Vite SPA
FROM node:20-alpine AS builder
WORKDIR /app

# Increase Node.js heap for large builds (551+ screens, 1.5MB main chunk)
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create health check file (more reliable than nginx return directive)
RUN echo "ok" > /usr/share/nginx/html/healthz

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
