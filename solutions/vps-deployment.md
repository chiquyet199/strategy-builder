# VPS Deployment Guide

## Overview

This guide will walk you through deploying the Strategy application to a Virtual Private Server (VPS) using Docker Compose. This is a cost-effective and flexible deployment option that gives you full control over your infrastructure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Choosing a VPS Provider](#choosing-a-vps-provider)
3. [Initial VPS Setup](#initial-vps-setup)
4. [Domain Configuration](#domain-configuration)
5. [Application Deployment](#application-deployment)
6. [SSL Certificate Setup](#ssl-certificate-setup)
7. [Post-Deployment](#post-deployment)
8. [Maintenance & Backups](#maintenance--backups)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, you should have:

- **A VPS server** (Ubuntu 22.04 LTS recommended)
- **A domain name** (optional but recommended for SSL)
- **Basic command-line knowledge** (we'll guide you through everything)
- **SSH access** to your VPS
- **Git repository** with your code

---

## Choosing a VPS Provider

Here are some recommended VPS providers:

### 1. DigitalOcean
- **Price**: $6-12/month for basic droplet
- **Pros**: Great documentation, reliable, easy to use
- **Link**: [digitalocean.com](https://www.digitalocean.com)

### 2. Linode
- **Price**: $5-12/month
- **Pros**: Good performance, competitive pricing
- **Link**: [linode.com](https://www.linode.com)

### 3. Hetzner Cloud
- **Price**: €4-8/month
- **Pros**: Very affordable, good performance
- **Link**: [hetzner.com/cloud](https://www.hetzner.com/cloud)

### 4. AWS Lightsail
- **Price**: $10-20/month
- **Pros**: AWS ecosystem, easy scaling
- **Link**: [aws.amazon.com/lightsail](https://aws.amazon.com/lightsail)

**Recommended**: Start with **DigitalOcean** or **Hetzner** for the best balance of price and ease of use.

### VPS Specifications

For this application, you'll need:
- **CPU**: 1-2 cores
- **RAM**: 2GB minimum (4GB recommended)
- **Storage**: 20GB minimum (SSD recommended)
- **OS**: Ubuntu 22.04 LTS

---

## Initial VPS Setup

### Step 1: Create Your VPS

1. Sign up with your chosen provider
2. Create a new VPS/droplet:
   - Choose **Ubuntu 22.04 LTS**
   - Select **1-2 CPU cores, 2-4GB RAM**
   - Choose a datacenter region close to your users
   - Add your SSH key (recommended) or set a root password
3. Note your VPS IP address

### Step 2: Connect to Your VPS

Open your terminal and connect via SSH:

```bash
# If you used SSH key
ssh -i ~/.ssh/id_rsa root@@YOUR_VPS_IP

# If you used password
ssh root@YOUR_VPS_IP
# Enter your password when prompted
```

**Security Tip**: If you're using password authentication, consider setting up SSH keys for better security.

### Step 3: Run the Setup Script

We've created an automated setup script that installs everything you need:

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/infrastructure/scripts/setup-vps.sh | bash

# OR if you prefer to review it first:
wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/infrastructure/scripts/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

**What the script does:**
- Updates system packages
- Installs Docker and Docker Compose
- Configures firewall (UFW)
- Installs Certbot for SSL certificates
- Creates application directory

**Manual Setup** (if you prefer to do it step by step):

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Log out and log back in for Docker group changes
```

### Step 4: Verify Installation

```bash
# Check Docker
docker --version
docker-compose --version

# Check firewall
sudo ufw status
```

---

## Domain Configuration

### Step 1: Point Your Domain to VPS

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Find DNS settings
3. Add an **A record**:
   - **Name**: `@` (or leave blank for root domain)
   - **Type**: `A`
   - **Value**: Your VPS IP address
   - **TTL**: 3600 (or default)

4. (Optional) Add a subdomain for API:
   - **Name**: `api`
   - **Type**: `A`
   - **Value**: Your VPS IP address

**Example DNS Records:**
```
Type    Name    Value           TTL
A       @       123.45.67.89    3600
A       api     123.45.67.89    3600
```

### Step 2: Wait for DNS Propagation

DNS changes can take 5 minutes to 48 hours to propagate. Check if it's working:

```bash
# Check if domain points to your VPS
ping yourdomain.com
# Should show your VPS IP address
```

You can use [whatsmydns.net](https://www.whatsmydns.net) to check DNS propagation globally.

---

## Application Deployment

### Step 1: Clone Your Repository

```bash
# Create application directory
sudo mkdir -p /opt/strategy
sudo chown $USER:$USER /opt/strategy
cd /opt/strategy

# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# OR if you have SSH access:
git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git .
```

### Step 2: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.production.example .env.production

# Edit the file
nano .env.production
```

**Required Configuration:**

```env
# Database Configuration
DB_USERNAME=postgres
DB_PASSWORD=YOUR_STRONG_DATABASE_PASSWORD  # Generate a strong password
DB_NAME=strategy

# Redis Configuration
REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD  # Generate a strong password

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=YOUR_GENERATED_JWT_SECRET  # Generate with: openssl rand -base64 32

# Frontend URL (your domain with https)
FRONTEND_URL=https://yourdomain.com

# Frontend API URL (same as FRONTEND_URL, used during build)
VITE_API_URL=https://yourdomain.com

# Logging
LOG_LEVEL=info
```

**Generate Strong Passwords:**

```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate Database Password
openssl rand -base64 24

# Generate Redis Password
openssl rand -base64 24
```

**Save the file**: Press `Ctrl+X`, then `Y`, then `Enter`

### Step 3: Update Nginx Configuration

```bash
# Edit Nginx configuration
nano infrastructure/nginx/conf.d/default.conf
```

Replace `server_name _;` with your domain:

```nginx
server_name yourdomain.com www.yourdomain.com;
```

Save and exit.

### Step 4: Deploy the Application

We've created a deployment script that handles everything:

```bash
# Make script executable
chmod +x infrastructure/scripts/deploy-vps.sh

# Run deployment
./infrastructure/scripts/deploy-vps.sh
```

**What the script does:**
- Loads environment variables
- Builds Docker images
- Stops old containers
- Starts new containers
- Checks service health

**Manual Deployment** (if you prefer):

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 5: Verify Services Are Running

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs nginx

# Test backend health
curl http://localhost/api/v1/health
```

---

## SSL Certificate Setup

### Step 1: Install Certbot (if not already installed)

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

### Step 2: Stop Nginx Container Temporarily

```bash
# Stop nginx container (we'll use standalone mode)
docker-compose -f docker-compose.prod.yml stop nginx
```

### Step 3: Obtain SSL Certificate

```bash
# Request certificate (replace with your domain)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose whether to share email (optional)
```

### Step 4: Copy Certificates to Nginx Directory

```bash
# Create SSL directory
mkdir -p infrastructure/nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem infrastructure/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem infrastructure/nginx/ssl/

# Set proper permissions
sudo chown $USER:$USER infrastructure/nginx/ssl/*.pem
chmod 644 infrastructure/nginx/ssl/*.pem
```

### Step 5: Restart Services

```bash
# Start nginx again
docker-compose -f docker-compose.prod.yml up -d nginx

# Verify SSL is working
curl https://yourdomain.com
```

### Step 6: Set Up Auto-Renewal

SSL certificates expire every 90 days. Set up automatic renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab (runs twice daily)
sudo crontab -e

# Add this line:
0 0,12 * * * certbot renew --quiet --deploy-hook "docker exec strategy-nginx-prod nginx -s reload"
```

**Alternative**: Create a renewal script:

```bash
# Create renewal script
sudo nano /usr/local/bin/renew-ssl.sh
```

Add this content:

```bash
#!/bin/bash
certbot renew --quiet
docker cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem strategy-nginx-prod:/etc/nginx/ssl/fullchain.pem
docker cp /etc/letsencrypt/live/yourdomain.com/privkey.pem strategy-nginx-prod:/etc/nginx/ssl/privkey.pem
docker exec strategy-nginx-prod nginx -s reload
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/renew-ssl.sh
```

---

## Post-Deployment

### Step 1: Test Your Application

1. **Visit your domain**: `https://yourdomain.com`
2. **Test API**: `https://yourdomain.com/api/v1/health`
3. **Test registration/login**: Create an account
4. **Check Swagger docs**: `https://yourdomain.com/api/docs`

### Step 2: Set Up Monitoring (Optional but Recommended)

**Basic Monitoring with Docker:**

```bash
# View resource usage
docker stats

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

**Set Up Uptime Monitoring** (Free services):
- [UptimeRobot](https://uptimerobot.com) - Free monitoring
- [Pingdom](https://www.pingdom.com) - Free tier available
- [StatusCake](https://www.statuscake.com) - Free tier available

### Step 3: Configure Firewall Rules

```bash
# Check current rules
sudo ufw status

# Allow only necessary ports (already done in setup)
# Port 22: SSH
# Port 80: HTTP (for Let's Encrypt)
# Port 443: HTTPS
```

---

## Maintenance & Backups

### Database Backups

We've created a backup script:

```bash
# Run manual backup
./infrastructure/scripts/backup-database.sh

# Set up automatic daily backups (add to crontab)
crontab -e

# Add this line (runs daily at 2 AM):
0 2 * * * cd /opt/strategy && ./infrastructure/scripts/backup-database.sh
```

**Backup Location**: `./backups/postgres/`

**Restore from Backup**:

```bash
# Stop services
docker-compose -f docker-compose.prod.yml stop backend

# Restore database
gunzip < backups/postgres/backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i strategy-postgres-prod psql -U postgres strategy

# Start services
docker-compose -f docker-compose.prod.yml start backend
```

### Application Updates

When you need to update your application:

```bash
# Pull latest code
cd /opt/strategy
git pull origin main

# Run deployment script
./infrastructure/scripts/deploy-vps.sh

# OR manually:
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Log Management

**View Logs:**

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f nginx

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

**Log Rotation** (Docker handles this automatically, but you can configure):

```bash
# Configure Docker log rotation
sudo nano /etc/docker/daemon.json
```

Add:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

---

## Troubleshooting

### Services Won't Start

**Check logs:**
```bash
docker-compose -f docker-compose.prod.yml logs
```

**Common issues:**
- **Port already in use**: Another service is using port 80/443
  ```bash
  sudo lsof -i :80
  sudo lsof -i :443
  ```
- **Environment variables not set**: Check `.env.production`
- **Database connection failed**: Check database credentials

### Database Connection Issues

```bash
# Check if database is running
docker-compose -f docker-compose.prod.yml ps postgres

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection
docker exec -it strategy-postgres-prod psql -U postgres -d strategy
```

### SSL Certificate Issues

```bash
# Check certificate expiration
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx SSL configuration
docker exec strategy-nginx-prod nginx -t
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Check for memory leaks
docker-compose -f docker-compose.prod.yml logs backend | grep -i error
```

### Application Not Accessible

1. **Check firewall:**
   ```bash
   sudo ufw status
   ```

2. **Check Nginx:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs nginx
   docker exec strategy-nginx-prod nginx -t
   ```

3. **Check DNS:**
   ```bash
   ping yourdomain.com
   nslookup yourdomain.com
   ```

4. **Check port binding:**
   ```bash
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :443
   ```

### Reset Everything

If you need to start fresh:

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Remove volumes (WARNING: This deletes all data!)
docker-compose -f docker-compose.prod.yml down -v

# Remove images
docker-compose -f docker-compose.prod.yml down --rmi all

# Start fresh
./infrastructure/scripts/deploy-vps.sh
```

---

## Security Best Practices

1. **Keep system updated:**
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```

2. **Use strong passwords** for all services

3. **Enable SSH key authentication** (disable password auth)

4. **Regular backups** (automated daily)

5. **Monitor logs** for suspicious activity

6. **Keep Docker images updated:**
   ```bash
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   ```

7. **Use firewall** (UFW is already configured)

8. **Regular security audits:**
   ```bash
   sudo apt-get install unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

---

## Cost Estimation

**Monthly Costs:**

- **VPS**: $5-12/month (depending on provider)
- **Domain**: $10-15/year (~$1/month)
- **Total**: ~$6-13/month

**Optional:**
- **Backup storage**: Free (included in VPS)
- **Monitoring**: Free (UptimeRobot, etc.)
- **CDN**: Free tier available (Cloudflare)

---

## Next Steps

1. ✅ Deploy your application
2. ✅ Set up SSL certificates
3. ✅ Configure backups
4. ✅ Set up monitoring
5. ✅ Test everything thoroughly
6. 🎉 Enjoy your deployed application!

---

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review application logs
3. Check Docker container status
4. Verify environment variables
5. Check firewall and DNS settings

---

## Summary

You've successfully deployed your application to a VPS! Here's what we accomplished:

- ✅ Set up a VPS server
- ✅ Installed Docker and Docker Compose
- ✅ Configured firewall
- ✅ Deployed application with Docker Compose
- ✅ Set up SSL certificates
- ✅ Configured automatic backups
- ✅ Set up monitoring

Your application is now live and accessible at `https://yourdomain.com`!

