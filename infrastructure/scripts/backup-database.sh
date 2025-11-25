#!/bin/bash

# Database Backup Script
# This script creates a backup of the PostgreSQL database
# Usage: ./infrastructure/scripts/backup-database.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo -e "${GREEN}📦 Creating database backup...${NC}"

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Get database credentials from environment or use defaults
DB_USER=${DB_USERNAME:-postgres}
DB_NAME=${DB_NAME:-strategy}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# Create backup using docker exec
docker exec strategy-postgres-prod pg_dump -U "${DB_USER}" "${DB_NAME}" > "${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_FILE}"

echo -e "${GREEN}✅ Backup created: ${BACKUP_FILE}.gz${NC}"

# Keep only last 7 days of backups
echo -e "${YELLOW}🧹 Cleaning old backups (keeping last 7 days)...${NC}"
find "${BACKUP_DIR}" -name "backup_*.sql.gz" -mtime +7 -delete

echo -e "${GREEN}✅ Backup complete!${NC}"

