# Domain and SSL Setup Guide

## Overview

This guide covers setting up a custom domain name and SSL certificates for your VPS deployment. This is **optional** - you can deploy and access your application using just the IP address, but a domain provides:

- Professional appearance
- Free SSL certificates (Let's Encrypt)
- Easier to remember URLs
- Better SEO and branding

---

## Prerequisites

- VPS server with application already deployed
- A domain name purchased from a registrar (GoDaddy, Namecheap, etc.)
- DNS access to configure your domain

---

## Step 1: Purchase a Domain (if you don't have one)

### Recommended Domain Registrars

1. **Namecheap** - $8-15/year
   - Link: [namecheap.com](https://www.namecheap.com)
   - Pros: Good prices, free privacy protection

2. **Google Domains** - $12/year
   - Link: [domains.google](https://domains.google)
   - Pros: Simple interface, good support

3. **Cloudflare Registrar** - At-cost pricing
   - Link: [cloudflare.com/products/registrar](https://www.cloudflare.com/products/registrar)
   - Pros: No markup, includes DNS

4. **GoDaddy** - $10-15/year
   - Link: [godaddy.com](https://www.godaddy.com)
   - Pros: Popular, easy to use

**Tip**: Look for `.com` domains first, but `.net`, `.org`, or country-specific TLDs (`.io`, `.dev`) also work.

---

## Step 2: Point Your Domain to VPS

### Get Your VPS IP Address

```bash
# On your VPS
curl ifconfig.me
# Or
hostname -I
```

### Configure DNS Records

1. **Log into your domain registrar**
2. **Find DNS Management** (might be called "DNS Settings", "Name Servers", or "DNS Records")
3. **Add an A Record**:

   - **Type**: `A`
   - **Name**: `@` (or leave blank for root domain)
   - **Value**: Your VPS IP address (e.g., `206.189.91.220`)
   - **TTL**: `3600` (or default)

4. **(Optional) Add www subdomain**:

   - **Type**: `A`
   - **Name**: `www`
   - **Value**: Your VPS IP address
   - **TTL**: `3600`

**Example DNS Records:**
```
Type    Name    Value           TTL
A       @       206.189.91.220  3600
A       www     206.189.91.220  3600
```

### Wait for DNS Propagation

DNS changes can take 5 minutes to 48 hours to propagate globally.

**Check DNS propagation:**
```bash
# From your local machine
ping yourdomain.com
# Should show your VPS IP address

# Or use online tools:
# - https://www.whatsmydns.net
# - https://dnschecker.org
```

**Test from command line:**
```bash
# Check if domain resolves to your IP
nslookup yourdomain.com
dig yourdomain.com
```

---

## Step 3: Update Environment Variables

Update your `.env.production` file on the VPS:

```bash
# On your VPS
cd /opt/strategy
nano .env.production
```

Update these values:

```env
# Change from IP to domain
FRONTEND_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com
```

**Save**: Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 4: Update Nginx Configuration

Update the Nginx configuration to use your domain:

```bash
# On your VPS
nano infrastructure/nginx/conf.d/default.conf
```

Replace `server_name _;` with your domain in both HTTP and HTTPS server blocks:

```nginx
# HTTP server
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Your domain here
    # ... rest of config
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;  # Your domain here
    # ... rest of config
}
```

**Save**: Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 5: Obtain SSL Certificate with Let's Encrypt

### Step 5.1: Install Certbot (if not already installed)

```bash
# On your VPS
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

### Step 5.2: Stop Nginx Container Temporarily

We need to stop Nginx to use standalone mode for certificate generation:

```bash
# Stop nginx container
docker-compose -f docker-compose.prod.yml stop nginx
```

### Step 5.3: Obtain SSL Certificate

```bash
# Request certificate (replace with your domain)
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service (type 'A' and press Enter)
# - Choose whether to share email (optional, type 'Y' or 'N')
```

**What happens:**
- Certbot starts a temporary web server on port 80
- Let's Encrypt verifies you control the domain
- Certificates are saved to `/etc/letsencrypt/live/yourdomain.com/`

### Step 5.4: Copy Certificates to Nginx Directory

```bash
# Create SSL directory (if it doesn't exist)
mkdir -p infrastructure/nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem infrastructure/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem infrastructure/nginx/ssl/

# Set proper permissions
sudo chown $USER:$USER infrastructure/nginx/ssl/*.pem
chmod 644 infrastructure/nginx/ssl/*.pem
```

### Step 5.5: Restart Services

```bash
# Start nginx again
docker-compose -f docker-compose.prod.yml up -d nginx

# Verify SSL is working
curl https://yourdomain.com
```

---

## Step 6: Rebuild Frontend with New URL

Since `VITE_API_URL` is a build-time variable, you need to rebuild the frontend:

```bash
# On your VPS
cd /opt/strategy

# Rebuild frontend with new API URL
docker-compose -f docker-compose.prod.yml build frontend

# Restart frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

Or use the deployment script:

```bash
./infrastructure/scripts/deploy-vps.sh
```

---

## Step 7: Set Up Automatic Certificate Renewal

SSL certificates expire every 90 days. Let's Encrypt recommends renewing every 60 days.

### Option 1: Using Crontab

```bash
# Edit crontab
sudo crontab -e

# Add this line (runs twice daily at midnight and noon)
0 0,12 * * * certbot renew --quiet --deploy-hook "cd /opt/strategy && docker-compose -f docker-compose.prod.yml exec -T nginx nginx -s reload"
```

### Option 2: Create a Renewal Script (Recommended)

```bash
# Create renewal script
sudo nano /usr/local/bin/renew-ssl.sh
```

Add this content:

```bash
#!/bin/bash
# SSL Certificate Renewal Script

# Renew certificates
certbot renew --quiet

# Copy new certificates to nginx directory
DOMAIN="yourdomain.com"  # Replace with your domain
APP_DIR="/opt/strategy"

cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ${APP_DIR}/infrastructure/nginx/ssl/fullchain.pem
cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ${APP_DIR}/infrastructure/nginx/ssl/privkey.pem

# Reload nginx
cd ${APP_DIR}
docker-compose -f docker-compose.prod.yml exec -T nginx nginx -s reload

echo "SSL certificates renewed and nginx reloaded"
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/renew-ssl.sh
```

Add to crontab:

```bash
sudo crontab -e

# Add this line (runs twice daily)
0 0,12 * * * /usr/local/bin/renew-ssl.sh
```

### Test Renewal

```bash
# Test renewal process (dry run)
sudo certbot renew --dry-run
```

---

## Step 8: Verify Everything Works

1. **Visit your domain**: `https://yourdomain.com`
2. **Check SSL**: Browser should show a padlock icon (no warnings)
3. **Test API**: `https://yourdomain.com/api/v1/health`
4. **Test www subdomain**: `https://www.yourdomain.com` (should redirect or work)

---

## Troubleshooting

### DNS Not Propagating

```bash
# Check DNS from multiple locations
# Use online tools: https://www.whatsmydns.net

# Check from command line
dig yourdomain.com @8.8.8.8  # Google DNS
dig yourdomain.com @1.1.1.1  # Cloudflare DNS
```

**Solution**: Wait longer (up to 48 hours), or check if DNS records are configured correctly.

### Certificate Generation Fails

**Error**: "Failed to connect to yourdomain.com:80"

**Solutions**:
- Make sure DNS is pointing to your VPS
- Ensure port 80 is open: `sudo ufw allow 80/tcp`
- Stop nginx before running certbot: `docker-compose -f docker-compose.prod.yml stop nginx`

### Nginx Can't Find Certificates

**Error**: "cannot load certificate"

**Solutions**:
- Check certificate files exist: `ls -la infrastructure/nginx/ssl/`
- Verify file permissions: `chmod 644 infrastructure/nginx/ssl/*.pem`
- Check nginx config paths match actual certificate locations

### Certificate Renewal Fails

**Solutions**:
- Test renewal manually: `sudo certbot renew --dry-run`
- Check certificate expiration: `sudo certbot certificates`
- Ensure renewal script has correct paths and permissions

### Mixed Content Warnings

If your site loads over HTTPS but some resources load over HTTP:

**Solution**: Update all URLs in your application to use HTTPS, or configure Nginx to force HTTPS:

```nginx
# Add to HTTP server block
location / {
    return 301 https://$host$request_uri;
}
```

---

## Security Best Practices

1. **Always use HTTPS** - Never serve sensitive data over HTTP
2. **Enable HSTS** - Already configured in nginx config
3. **Keep certificates updated** - Set up automatic renewal
4. **Use strong ciphers** - Already configured in nginx config
5. **Monitor certificate expiration** - Check monthly

---

## Cost

- **Domain**: $8-15/year (~$1/month)
- **SSL Certificate**: Free (Let's Encrypt)
- **Total**: ~$1/month

---

## Next Steps

After setting up your domain:

1. ✅ Update all references to use the domain
2. ✅ Set up monitoring for your domain
3. ✅ Configure email (optional, for notifications)
4. ✅ Set up CDN (optional, Cloudflare free tier)

---

## Summary

You've successfully:
- ✅ Configured DNS to point to your VPS
- ✅ Obtained free SSL certificates from Let's Encrypt
- ✅ Configured Nginx to serve HTTPS
- ✅ Set up automatic certificate renewal

Your application is now accessible at `https://yourdomain.com` with a valid SSL certificate! 🎉

