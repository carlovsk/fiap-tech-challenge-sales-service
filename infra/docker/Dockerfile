# Multi-stage build for Vehicle Sales Service

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript using build-specific config
RUN npx tsc --project tsconfig.build.json
# Rewrite path aliases to relative paths for runtime
RUN npx tsc-alias -p tsconfig.build.json

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Copy Prisma schema and generated client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY infra/docker/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Expose port
EXPOSE 3001

# Use entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]

