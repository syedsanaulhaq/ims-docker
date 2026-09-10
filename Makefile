.PHONY: help dev test prod build logs stop restart clean

help:
	@echo "📦 IMS Docker Commands"
	@echo "======================"
	@echo "make dev        - Start development environment"
	@echo "make test       - Start test environment"
	@echo "make build      - Build all images"
	@echo "make logs       - View all logs (dev)"
	@echo "make logs-test  - View test logs"
	@echo "make stop       - Stop all containers"
	@echo "make restart    - Restart all containers"
	@echo "make clean      - Remove all containers & volumes"
	@echo "make status     - Check container status"
	@echo "make backup     - Backup database"

dev:
	@echo "🚀 Starting Development Environment..."
	docker compose -f docker-compose.yml up -d
	@echo "✅ Dev running: Frontend http://localhost:9080, Backend http://localhost:3001"

test:
	@echo "🧪 Starting Test Environment..."
	docker compose -f docker-compose.test.yml up -d
	@echo "✅ Test running: Frontend http://localhost:4173, Backend http://localhost:5001"

build:
	@echo "🔨 Building Docker images..."
	docker compose -f docker-compose.yml build --no-cache
	docker compose -f docker-compose.test.yml build --no-cache
	@echo "✅ Build complete!"

logs:
	docker compose -f docker-compose.yml logs -f

logs-test:
	docker compose -f docker-compose.test.yml logs -f

logs-prod:
	@echo "📋 Production Logs (SSH):"
	@read -p "Enter server IP [172.20.150.127]: " SERVER_IP; \
	read -p "Enter SSH user [ubuntu]: " SSH_USER; \
	ssh $$SSH_USER@$$SERVER_IP "cd ~/ims-docker-v1 && docker compose logs -f"

status:
	@echo "📊 Container Status:"
	docker ps -a | grep ims

stop:
	@echo "⛔ Stopping all containers..."
	docker compose -f docker-compose.yml down
	docker compose -f docker-compose.test.yml down
	@echo "✅ Stopped!"

restart:
	@echo "🔄 Restarting containers..."
	docker compose -f docker-compose.yml restart
	docker compose -f docker-compose.test.yml restart
	@echo "✅ Restarted!"

clean:
	@echo "🗑️  Cleaning up..."
	docker compose -f docker-compose.yml down -v
	docker compose -f docker-compose.test.yml down -v
	@echo "✅ Cleaned!"

backup:
	@echo "💾 Backing up database..."
	docker exec ims-backend-dev bash -c "sqlcmd -S SYED-FAZLI-LAPT -U inventorymanagementuser -P 2016Wfp61@ -Q 'BACKUP DATABASE InventoryManagementDB TO DISK = '\''/var/opt/mssql/backup/InventoryManagementDB_$$(date +%Y%m%d_%H%M%S).bak'\'' WITH INIT, COMPRESSION'"
	@echo "✅ Backup complete!"

prune:
	@echo "🧹 Pruning unused Docker resources..."
	docker system prune -f --volumes
	@echo "✅ Pruned! Freed up space."
