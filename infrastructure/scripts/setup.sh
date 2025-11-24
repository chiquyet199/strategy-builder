#!/bin/bash

set -e

echo "🔧 Setting up development environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Error: Node.js version 20 or higher is required"
    exit 1
fi

# Install root dependencies
echo -e "${BLUE}📦 Installing root dependencies...${NC}"
npm install

# Install workspace dependencies
echo -e "${BLUE}📦 Installing workspace dependencies...${NC}"
npm install --workspaces

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "You can now run:"
echo "  npm run dev          # Start both backend and frontend"
echo "  npm run docker:up    # Start with Docker"
echo "  npm run test         # Run all tests"

