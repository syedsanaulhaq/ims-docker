#!/bin/bash
# Helper script to quickly run any SQL file directly against the production database
# Usage: ./run-prod-sql.sh <path_to_sql_file>

if [ -z "$1" ]; then
  echo "Usage: ./run-prod-sql.sh <path_to_sql_file>"
  echo "Example: ./run-prod-sql.sh update-production-db-sync.sql"
  exit 1
fi

echo "Running $1 on production database..."
sudo docker exec -i invmis-db-prod /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Pakistan@786" -d InventoryManagementDB -C < "$1"

echo "Done!"
