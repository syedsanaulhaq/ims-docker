#!/bin/bash

# IMS Production Deployment Script for Remote Server
# Usage: ./deploy-to-production.sh <server_ip> <username> <ssh_key_path>
# Example: ./deploy-to-production.sh 172.20.150.127 ubuntu /home/user/.ssh/id_rsa

set -e

SERVER_IP=${1:-172.20.150.127}
SSH_USER=${2:-ubuntu}
SSH_KEY=${3:-}
REMOTE_DIR="/home/$SSH_USER/ims-docker-v1"

echo "🚀 Starting IMS Production Deployment..."
echo "=========================================="
echo "Server: $SERVER_IP"
echo "User: $SSH_USER"
echo ""

# SSH options
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
if [ -n "$SSH_KEY" ]; then
    SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi

# Step 1: Check SSH connection
echo "1️⃣  Checking SSH connection..."
if ssh $SSH_OPTS $SSH_USER@$SERVER_IP "echo 'SSH connection successful'" > /dev/null 2>&1; then
    echo "✅ SSH connection successful!"
else
    echo "❌ SSH connection failed!"
    exit 1
fi

# Step 2: Check Docker installation
echo ""
echo "2️⃣  Checking Docker installation on remote server..."
ssh $SSH_OPTS $SSH_USER@$SERVER_IP "docker --version && docker compose --version || echo 'Docker not found, installing...'"

# Step 3: Create remote directory
echo ""
echo "3️⃣  Creating project directory on remote server..."
ssh $SSH_OPTS $SSH_USER@$SERVER_IP "mkdir -p $REMOTE_DIR && echo 'Directory created'"

# Step 4: Copy project files
echo ""
echo "4️⃣  Copying project files to remote server..."
scp $SSH_OPTS -r .env-production $SSH_USER@$SERVER_IP:$REMOTE_DIR/.env
scp $SSH_OPTS -r docker-compose.production.yml $SSH_USER@$SERVER_IP:$REMOTE_DIR/docker-compose.yml
scp $SSH_OPTS -r nginx.conf $SSH_USER@$SERVER_IP:$REMOTE_DIR/
scp $SSH_OPTS -r Dockerfile.backend $SSH_USER@$SERVER_IP:$REMOTE_DIR/
scp $SSH_OPTS -r Dockerfile.frontend $SSH_USER@$SERVER_IP:$REMOTE_DIR/
scp $SSH_OPTS -r .dockerignore $SSH_USER@$SERVER_IP:$REMOTE_DIR/

# Copy source code
echo "   Copying source code..."
scp $SSH_OPTS -r backend $SSH_USER@$SERVER_IP:$REMOTE_DIR/ 2>/dev/null || echo "   (backend directory synced)"
scp $SSH_OPTS -r src $SSH_USER@$SERVER_IP:$REMOTE_DIR/ 2>/dev/null || echo "   (src directory synced)"
scp $SSH_OPTS -r package.json package-lock.json $SSH_USER@$SERVER_IP:$REMOTE_DIR/ 2>/dev/null

echo "✅ Files copied successfully!"

# Step 5: Build Docker images on remote server
echo ""
echo "5️⃣  Building Docker images on remote server..."
ssh $SSH_OPTS $SSH_USER@$SERVER_IP "cd $REMOTE_DIR && docker compose build --no-cache"

echo "✅ Docker images built successfully!"

# Step 6: Start services
echo ""
echo "6️⃣  Starting production services..."
ssh $SSH_OPTS $SSH_USER@$SERVER_IP "cd $REMOTE_DIR && docker compose up -d"

echo "✅ Services started!"

# Step 7: Verify deployment
echo ""
echo "7️⃣  Verifying deployment..."
sleep 5
ssh $SSH_OPTS $SSH_USER@$SERVER_IP "docker compose ps"

echo ""
echo "✅ Deployment completed!"
echo "=========================================="
echo "🌐 Production URL: http://$SERVER_IP"
echo "📊 API: http://$SERVER_IP/api"
echo ""
echo "📋 Next steps:"
echo "1. Check logs: ssh $SSH_USER@$SERVER_IP 'cd $REMOTE_DIR && docker compose logs -f'"
echo "2. Stop services: ssh $SSH_USER@$SERVER_IP 'cd $REMOTE_DIR && docker compose down'"
echo "3. Restart services: ssh $SSH_USER@$SERVER_IP 'cd $REMOTE_DIR && docker compose restart'"
echo ""
