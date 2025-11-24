#!/bin/bash

set -e

echo "🚀 Starting deployment process..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the root directory."
    exit 1
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci

# Run tests
echo -e "${BLUE}🧪 Running tests...${NC}"
npm run test

# Lint code
echo -e "${BLUE}🔍 Linting code...${NC}"
npm run lint

# Build applications
echo -e "${BLUE}🏗️  Building applications...${NC}"
npm run build

# Build Docker images
echo -e "${BLUE}🐳 Building Docker images...${NC}"
docker-compose build

# Deploy to Kubernetes (uncomment if using K8s)
# echo -e "${BLUE}☸️  Deploying to Kubernetes...${NC}"
# kubectl apply -f infrastructure/k8s/

echo -e "${GREEN}✅ Deployment complete!${NC}"

