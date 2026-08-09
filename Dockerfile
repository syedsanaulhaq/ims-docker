# 🐳 InvMIS Production Dockerfile
# Multi-stage build for optimized production deployment

# ============================================
# 📦 Build Stage - Frontend
# ============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Install frontend dependencies
COPY package*.json ./
RUN npm ci --silent

# Copy frontend source and build
COPY . .
RUN npm run build

# ============================================
# 🚀 Production Stage - Backend + Frontend
# ============================================
FROM node:18-alpine AS production

# 🔐 Security: Create non-root user
RUN addgroup -g 1001 -S invmis && \
    adduser -S invmis -u 1001

# 📁 Setup directories
WORKDIR /app
RUN mkdir -p /app/uploads /var/log/invmis && \
    chown -R invmis:invmis /app /var/log/invmis

# 📦 Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production --silent && \
    npm cache clean --force

# 📋 Copy application files
COPY --chown=invmis:invmis . .

# 🌐 Copy built frontend from build stage
COPY --from=frontend-builder --chown=invmis:invmis /app/frontend/dist ./public

# 🔧 Install additional production tools
RUN apk add --no-cache dumb-init

# 🏥 Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# 👤 Switch to non-root user
USER invmis

# 🌐 Expose ports
EXPOSE 5000 80

# 📊 Set production environment
ENV NODE_ENV=production

# 🚀 Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "invmis-api.cjs"]
EXPOSE 4173

# Create startup script
RUN echo '#!/bin/sh\nnpm run prod:start' > start.sh && chmod +x start.sh

# Start the application
CMD ["./start.sh"]
