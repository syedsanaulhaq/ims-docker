# 🐳 InvMIS Production Dockerfile
FROM node:18-alpine

# 🔐 Security: Create non-root user
RUN addgroup -g 1001 -S invmis && \
    adduser -S invmis -u 1001

# 📁 Setup directories
WORKDIR /app
RUN mkdir -p /app/uploads /var/log/invmis && \
    chown -R invmis:invmis /app /var/log/invmis

# 📦 Copy application dependencies and source
COPY --chown=invmis:invmis package*.json ./
COPY --chown=invmis:invmis healthcheck.js ./
COPY --chown=invmis:invmis node_modules ./node_modules
COPY --chown=invmis:invmis server ./server
COPY --chown=invmis:invmis dist ./public
COPY --chown=invmis:invmis dist ./dist

# 🌐 Expose ports
EXPOSE 5000 80

# 📊 Set production environment
ENV NODE_ENV=production

# 🚀 Start application directly with node
CMD ["node", "server/index.cjs"]
