# Outreach Sub-Agent Dockerfile
# Runs in isolated sidecar with ephemeral credentials

FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Build
RUN npm run build

# Production image - minimal footprint
FROM node:20-alpine AS runtime

WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S agent -u 1001 -G nodejs

# Copy only production files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Create log directory
RUN mkdir -p /workspace/logs && chown -R agent:nodejs /workspace

USER agent

# Environment variables (overridden at runtime)
ENV NODE_ENV=production
ENV LOG_DIR=/workspace/logs
ENV DRY_RUN=true

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "console.log('healthy')" || exit 1

# Run
CMD ["node", "dist/index.js"]
