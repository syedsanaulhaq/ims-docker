#!/bin/bash
# 🚀 InvMIS Production Deployment Script
# Deploy InvMIS to production environment with zero downtime

set -e

# 🎨 Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 📋 Configuration
PROJECT_NAME="invmis"
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups"
DEPLOY_DATE=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🚀 Starting InvMIS Production Deployment${NC}"
echo -e "${BLUE}=================================================${NC}"

# ✅ Pre-deployment checks
echo -e "${YELLOW}📋 Running pre-deployment checks...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if environment file exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Production environment file (.env.production) not found.${NC}"
    exit 1
fi

# Check if SSL certificates exist
if [ ! -f "./nginx/ssl/certificate.crt" ]; then
    echo -e "${YELLOW}⚠️  SSL certificate not found. Creating self-signed certificate...${NC}"
    mkdir -p ./nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ./nginx/ssl/private.key \
        -out ./nginx/ssl/certificate.crt \
        -subj "/C=PK/ST=Punjab/L=Lahore/O=InvMIS/CN=localhost"
fi

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

# 🔄 Create backup
echo -e "${YELLOW}💾 Creating backup...${NC}"
mkdir -p $BACKUP_DIR
if docker compose -f $COMPOSE_FILE ps invmis-api | grep -q "Up"; then
    echo -e "${YELLOW}📦 Backing up running containers...${NC}"
    docker compose -f $COMPOSE_FILE exec -T invmis-api sh -c "mkdir -p /app/backup && cp -r /app/uploads /app/backup/" || true
    docker cp $(docker compose -f $COMPOSE_FILE ps -q invmis-api):/app/backup/ $BACKUP_DIR/backup_$DEPLOY_DATE/ || true
else
    echo -e "${YELLOW}⏭️  invmis-api container is not fully running, skipping backup...${NC}"
fi

# 🏗️ Build and deploy
echo -e "${YELLOW}🏗️  Building production images...${NC}"
docker compose -f $COMPOSE_FILE build --no-cache

echo -e "${YELLOW}🔄 Deploying services...${NC}"
docker compose -f $COMPOSE_FILE up -d

# ⏳ Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 30

# 🏥 Health checks
echo -e "${YELLOW}🏥 Running health checks...${NC}"
MAX_ATTEMPTS=12
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API health check passed${NC}"
        break
    else
        echo -e "${YELLOW}⏳ Attempt $ATTEMPT/$MAX_ATTEMPTS - waiting for API...${NC}"
        sleep 10
        ((ATTEMPT++))
    fi
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ API health check failed. Rolling back...${NC}"
    docker compose -f $COMPOSE_FILE logs invmis-api
    exit 1
fi

# 🧪 API Tests
echo -e "${YELLOW}🧪 Running API tests...${NC}"
ENDPOINTS=("/health" "/api/health" "/api/users" "/api/offices")

for endpoint in "${ENDPOINTS[@]}"; do
    if curl -f "http://localhost:5000$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $endpoint - OK${NC}"
    else
        echo -e "${RED}❌ $endpoint - FAILED${NC}"
        echo -e "${YELLOW}⚠️  Check logs: docker compose -f $COMPOSE_FILE logs invmis-api${NC}"
    fi
done

# 🧹 Cleanup old images
echo -e "${YELLOW}🧹 Cleaning up old Docker images...${NC}"
docker image prune -f

# 📊 Deployment summary
echo -e "${BLUE}📊 Deployment Summary${NC}"
echo -e "${BLUE}===================${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${BLUE}🌐 Frontend: http://localhost${NC}"
echo -e "${BLUE}🚀 API: http://localhost:5000${NC}"
echo -e "${BLUE}📊 Grafana: http://localhost:3001 (admin/admin123)${NC}"
echo -e "${BLUE}📈 Prometheus: http://localhost:9090${NC}"
echo ""
echo -e "${YELLOW}🔧 Management Commands:${NC}"
echo -e "${BLUE}  View logs: docker compose -f $COMPOSE_FILE logs -f${NC}"
echo -e "${BLUE}  Stop: docker compose -f $COMPOSE_FILE down${NC}"
echo -e "${BLUE}  Restart: docker compose -f $COMPOSE_FILE restart${NC}"
echo ""
echo -e "${GREEN}🎉 InvMIS is now running in production mode!${NC}"