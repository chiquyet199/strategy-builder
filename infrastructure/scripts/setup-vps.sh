#!/bin/bash

# VPS Initial Setup Script
# Run this script on a fresh Ubuntu/Debian VPS to set up the environment
# Usage: curl -fsSL https://raw.githubusercontent.com/your-repo/setup-vps.sh | bash
# Or: wget -O- https://raw.githubusercontent.com/your-repo/setup-vps.sh | bash

set -e

echo "🚀 Setting up VPS for Strategy Application..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
echo "📦 Installing required packages..."
sudo apt-get install -y \
    curl \
    wget \
    git \
    ufw \
    certbot \
    python3-certbot-nginx \
    htop \
    nano \
    unzip

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
echo "✅ Firewall configured"

# Create application directory
echo "📁 Creating application directory..."
APP_DIR="/opt/strategy"
sudo mkdir -p "${APP_DIR}"
sudo chown $USER:$USER "${APP_DIR}"

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Clone your repository: cd ${APP_DIR} && git clone <your-repo-url> ."
echo "2. Copy .env.production.example to .env.production and configure it"
echo "3. Run the deployment script: ./infrastructure/scripts/deploy-vps.sh"
echo ""
echo "⚠️  Note: You may need to log out and log back in for Docker group changes to take effect"

