# Base images come from AWS's mirror of the Docker official images
# (public.ecr.aws/docker/library), not Docker Hub: Docker Hub's anonymous pull
# rate limit / auth outage blocked every build on 2026-10-09, including a
# production rollback (VTID-05015). Same images, same tags.

# Stage 1: Build the Vite SPA
FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app

# Increase Node.js heap for large builds (551+ screens, 1.5MB main chunk)
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM public.ecr.aws/docker/library/nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create health check files (more reliable than nginx return directive).
# /alive is the platform-canonical health path (vitana-platform CLAUDE.md
# Always-rule #15) — the AWS staging target group probes it; /healthz kept
# for the existing Docker HEALTHCHECK below.
RUN echo "ok" > /usr/share/nginx/html/healthz \
  && echo "ok" > /usr/share/nginx/html/alive

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
