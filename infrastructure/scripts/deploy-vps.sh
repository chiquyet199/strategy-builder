#!/bin/bash

# VPS Deployment Script
# This script helps deploy the application to a VPS server
# Usage: ./infrastructure/scripts/deploy-vps.sh

set -e  # Exit on error

echo "🚀 Starting VPS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Error: .env.production file not found!${NC}"
    echo "Please copy .env.production.example to .env.production and configure it."
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Check required variables
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "CHANGE_THIS_GENERATE_STRONG_SECRET" ]; then
    echo -e "${RED}❌ Error: JWT_SECRET must be set in .env.production${NC}"
    exit 1
fi

if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "CHANGE_THIS_STRONG_PASSWORD" ]; then
    echo -e "${RED}❌ Error: DB_PASSWORD must be set in .env.production${NC}"
    exit 1
fi

if [ -z "$REDIS_PASSWORD" ] || [ "$REDIS_PASSWORD" = "CHANGE_THIS_STRONG_PASSWORD" ]; then
    echo -e "${RED}❌ Error: REDIS_PASSWORD must be set in .env.production${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables loaded${NC}"

# Pull latest code (if using git)
if [ -d .git ]; then
    echo "📥 Pulling latest code..."
    git pull origin main || git pull origin master
fi

# Build Docker images
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

# Show logs
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📋 Service Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "📝 View logs with: docker-compose -f docker-compose.prod.yml logs -f"
echo "🛑 Stop services with: docker-compose -f docker-compose.prod.yml down"

