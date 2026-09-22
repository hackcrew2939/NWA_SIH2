# ==============================================================================
# Multi-Stage Production Dockerfile for NWA Enterprise Platform
# High-concurrency Node.js microservice architecture
# ==============================================================================

# Stage 1: Build & Dependency Resolution
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts

# Stage 2: Minimal Distroless Production Image
FROM node:24-alpine AS runner

# Set metadata labels
LABEL org.opencontainers.image.title="NWA Enterprise Analytics & Early Warning Platform" \
      org.opencontainers.image.description="National-scale meteorological analytics, early warning AI & multi-worker cluster" \
      org.opencontainers.image.version="2.4.0" \
      org.opencontainers.image.authors="NWA DevOps Team <devops@nwa.gov.in>" \
      org.opencontainers.image.vendor="National Weather Analytics"

# Set runtime environment
ENV NODE_ENV=production \
    PORT=3000 \
    CLUSTER_MODE=true \
    MAX_WORKERS=4 \
    DATABASE_PATH=/usr/src/app/data/nwa_analytics.sqlite

WORKDIR /usr/src/app

# Create unprivileged service user and persistent directories
RUN addgroup -S -g 1001 nwagroup && \
    adduser -S -u 1001 -G nwagroup nwauser && \
    mkdir -p /usr/src/app/data /usr/src/app/logs && \
    chown -R nwauser:nwagroup /usr/src/app

# Copy production node_modules from builder
COPY --from=builder --chown=nwauser:nwagroup /usr/src/app/node_modules ./node_modules

# Copy application code with unprivileged ownership
COPY --chown=nwauser:nwagroup . .

# Expose standard application port
EXPOSE 3000

# Switch to unprivileged user
USER nwauser

# Healthcheck probe for container orchestrators (Docker Swarm / K8s)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start multi-core cluster supervisor
CMD ["node", "cluster.js"]
