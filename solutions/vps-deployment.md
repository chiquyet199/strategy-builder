# VPS Deployment Guide

## Overview

This guide will walk you through deploying the Strategy application to a Virtual Private Server (VPS) using Docker Compose. This is a cost-effective and flexible deployment option that gives you full control over your infrastructure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Choosing a VPS Provider](#choosing-a-vps-provider)
3. [Initial VPS Setup](#initial-vps-setup)
4. [Domain Configuration](#domain-configuration-optional) (Optional)
5. [Application Deployment](#application-deployment)
6. [SSL Certificate Setup](#ssl-certificate-setup-optional) (Optional)
7. [Post-Deployment](#post-deployment)
8. [Maintenance & Backups](#maintenance--backups)
9. [Troubleshooting](#troubleshooting)

**Quick Start**: You can deploy using just your VPS IP address - domain and SSL are optional! See [Domain Setup Guide](./vps-domain-setup.md) for adding a domain later.

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

We've created an automated setup script that installs everything you need. Since you're learning, we'll use the manual copy method so you can see what the script does.

#### Method 1: Manual Copy (Recommended for Learning)

1. **On your local machine**, view the script content:
   ```bash
   cat infrastructure/scripts/setup-vps.sh
   ```

2. **On your VPS**, create the script file:
   ```bash
   nano setup-vps.sh
   ```

3. **Copy and paste** the entire script content into Nano:
   - On macOS: Use `Command + V` to paste
   - Or right-click and select "Paste" in your terminal

4. **Save and exit** Nano:
   - Press `Control + X` (not Command!)
   - Press `Y` to confirm saving
   - Press `Enter` to confirm the filename

5. **Make the script executable**:
   ```bash
   chmod +x setup-vps.sh
   ```
   (This gives the file permission to run as a program)

6. **Run the script**:
   ```bash
   ./setup-vps.sh
   ```

**What the script does:**
- Updates system packages (gets latest security patches)
- Installs essential tools (curl, git, etc.)
- Installs Docker (for running containers)
- Installs Docker Compose (for managing multiple containers)
- Configures firewall (UFW) - allows only necessary ports
- Installs Certbot for SSL certificates
- Creates application directory at `/opt/strategy`

**Note:** The script has detailed comments explaining each line - read through it to understand what's happening!

#### Method 2: Copy via SCP (Alternative)

If you prefer, you can copy the file directly from your local machine:

```bash
# From your local machine (in the project directory)
scp -i ~/.ssh/id_rsa infrastructure/scripts/setup-vps.sh root@YOUR_VPS_IP:/root/

# Then SSH in and run it
ssh -i ~/.ssh/id_rsa root@YOUR_VPS_IP
chmod +x setup-vps.sh
./setup-vps.sh
```

#### Method 3: Manual Setup (Step by Step)

If you prefer to run each command manually to understand what's happening:

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

## Domain Configuration (Optional)

**You can skip this section and use your VPS IP address directly!** A domain is optional but recommended for production use.

### Quick Start Without Domain

If you want to deploy quickly without a domain:

1. **Use your VPS IP address** in environment variables (see Step 2 below)
2. **Skip SSL setup** (or use self-signed certificates for testing)
3. **Access your app** via `http://YOUR_VPS_IP`

**Limitations without domain:**
- No free SSL certificates (Let's Encrypt requires a domain)
- Browser security warnings with self-signed certificates
- Harder to remember IP addresses
- Less professional appearance

### Setting Up a Domain (Optional)

If you want to set up a custom domain and SSL certificates, see the detailed guide:

📖 **[Domain and SSL Setup Guide](./vps-domain-setup.md)**

This guide covers:
- Purchasing a domain
- Configuring DNS records
- Obtaining free SSL certificates (Let's Encrypt)
- Setting up automatic certificate renewal

**You can add a domain later** - your application will work fine with just an IP address for now.

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
DB_SSL=false  # Disable SSL for Docker internal network (SSL not needed)

# Redis Configuration
REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD  # Generate a strong password

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=YOUR_GENERATED_JWT_SECRET  # Generate with: openssl rand -base64 32

# Frontend URL
# Option 1: Use IP address (for quick testing)
FRONTEND_URL=http://YOUR_VPS_IP
VITE_API_URL=http://YOUR_VPS_IP

# Option 2: Use domain (if you have one set up)
# FRONTEND_URL=https://yourdomain.com
# VITE_API_URL=https://yourdomain.com

# Logging
LOG_LEVEL=info
```

**Important**: `DB_SSL=false` is required for Docker Compose deployments. Since all services communicate on the same internal Docker network, SSL is not needed. Only set `DB_SSL=true` if you're using an external database service that requires SSL.

**Note**: Replace `YOUR_VPS_IP` with your actual VPS IP address (e.g., `http://206.189.91.220`). If you have a domain, use that instead (see [Domain Setup Guide](./vps-domain-setup.md)).

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

### Step 3: Configure Nginx

#### Option A: Using IP Address (No Domain)

The default Nginx configuration works with IP addresses. No changes needed!

The config uses `server_name _;` which accepts any hostname/IP address.

#### Option B: Using Domain (If You Have One)

If you have a domain set up, update the Nginx configuration:

```bash
# Edit Nginx configuration
nano infrastructure/nginx/conf.d/default.conf
```

Replace `server_name _;` with your domain in both HTTP and HTTPS blocks:

```nginx
# HTTP server
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    # ... rest of config
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    # ... rest of config
}
```

**Note**: If using a domain, you'll also need SSL certificates. See [Domain Setup Guide](./vps-domain-setup.md) for details.

Save and exit: Press `Ctrl+X`, then `Y`, then `Enter`

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

## SSL Certificate Setup (Optional)

**Skip this section if you're using IP address only!**

SSL certificates require a domain name. If you're using just an IP address, you can:
- Use HTTP only (not recommended for production)
- Use self-signed certificates (browsers will show warnings)

### For Domain Setup

If you have a domain set up, see the detailed guide:

📖 **[Domain and SSL Setup Guide](./vps-domain-setup.md)**

This covers:
- Obtaining free SSL certificates from Let's Encrypt
- Configuring Nginx for HTTPS
- Setting up automatic certificate renewal

### Quick Self-Signed Certificate (For Testing)

If you want HTTPS with IP address (for testing only):

```bash
# Create SSL directory
mkdir -p infrastructure/nginx/ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infrastructure/nginx/ssl/privkey.pem \
  -out infrastructure/nginx/ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=YOUR_VPS_IP"

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

**Note**: Browsers will show security warnings with self-signed certificates. This is fine for testing but not for production.

---

## Post-Deployment

### Step 1: Test Your Application

**If using IP address:**
1. **Visit your app**: `http://YOUR_VPS_IP` (or `https://YOUR_VPS_IP` if using self-signed cert)
2. **Test API**: `http://YOUR_VPS_IP/api/v1/health`
3. **Test registration/login**: Create an account
4. **Check Swagger docs**: `http://YOUR_VPS_IP/api/docs`

**If using domain:**
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

**Error: "The server does not support SSL connections"**

This happens when the backend tries to connect to PostgreSQL with SSL, but PostgreSQL in Docker doesn't have SSL enabled.

**Solution**: Add `DB_SSL=false` to your `.env.production` file:

```bash
# Edit .env.production
nano .env.production

# Add this line in the Database Configuration section:
DB_SSL=false

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

**Other database issues:**

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

**Your application is now live!**

- **Using IP**: Access at `http://YOUR_VPS_IP`
- **Using Domain**: Access at `https://yourdomain.com` (see [Domain Setup Guide](./vps-domain-setup.md))

**Next Steps:**
- Set up a domain and SSL certificates (optional) - see [Domain Setup Guide](./vps-domain-setup.md)
- Configure monitoring and alerts
- Set up regular backups
- Test all features thoroughly

