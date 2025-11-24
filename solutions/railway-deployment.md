# Railway Deployment Guide

## Overview

This document provides step-by-step instructions for deploying the Strategy application to Railway, a modern cloud platform that simplifies deployment and infrastructure management.

## Date
November 24, 2024

## Architecture

The deployment consists of:
- **Backend Service**: NestJS API (Node.js service)
- **Frontend Service**: Vue 3 static site (served via Node.js)
- **PostgreSQL**: Railway managed PostgreSQL plugin
- **Redis**: Railway managed Redis plugin

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Code should be in a GitHub repository
3. **Lock Files Committed**: Ensure all `package-lock.json` files are committed and in sync with `package.json` files
   ```bash
   # Update lock files if needed
   npm install
   git add package-lock.json apps/*/package-lock.json
   git commit -m "Update package-lock.json files"
   ```
4. **Railway CLI** (optional): For advanced operations
   ```bash
   npm install -g @railway/cli
   railway login
   ```

## Step-by-Step Deployment

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will auto-detect the monorepo structure

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically:
   - Create a PostgreSQL instance
   - Provide `DATABASE_URL` environment variable
   - Set up connection pooling

**Note**: The `DATABASE_URL` will be automatically available to all services in the project.

### Step 3: Add Redis Service

1. In your Railway project, click "+ New"
2. Select "Database" → "Add Redis"
3. Railway will automatically:
   - Create a Redis instance
   - Provide `REDIS_URL` environment variable
   - Set up authentication

**Note**: The `REDIS_URL` will be automatically available to all services in the project.

### Step 4: Create Backend Service

1. In your Railway project, click "+ New"
2. Select "GitHub Repo" (or "Empty Service" if already connected)
3. Configure the service:
   - **Name**: `backend` (or `strategy-backend`)
   - **Root Directory**: `apps/backend`
   - **Build Command**: Leave empty (Railway will auto-detect) OR `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Health Check Path**: `/api/v1/health`

**Important**: Make sure all `package-lock.json` files are committed to your repository before deploying. Railway uses `npm ci` which requires lock files to be in sync with `package.json`.

4. **Link Services**:
   - Click on the backend service
   - Go to "Variables" tab
   - Railway automatically provides:
     - `DATABASE_URL` (from PostgreSQL service)
     - `REDIS_URL` (from Redis service)
     - `PORT` (automatically set by Railway)

5. **Set Environment Variables**:
   ```
   NODE_ENV=production
   JWT_SECRET=<generate-strong-secret>
   FRONTEND_URL=<will-set-after-frontend-deployment>
   LOG_LEVEL=info
   ```

   **Generate JWT Secret**:
   ```bash
   openssl rand -base64 32
   ```

### Step 5: Create Frontend Service

1. In your Railway project, click "+ New"
2. Select "GitHub Repo"
3. Configure the service:
   - **Name**: `frontend` (or `strategy-frontend`)
   - **Root Directory**: `apps/frontend`
   - **Build Command**: Leave empty (Railway will auto-detect) OR `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -l $PORT`
   - **Health Check Path**: `/`

**Important**: Make sure all `package-lock.json` files are committed to your repository before deploying. Railway uses `npm ci` which requires lock files to be in sync with `package.json`.

4. **Set Environment Variables** (Build-time):
   ```
   NODE_ENV=production
   VITE_API_URL=<backend-service-url>
   ```

   **Important**: `VITE_API_URL` must be set before building. Get the backend URL from Railway dashboard after backend deployment.

### Step 6: Configure Service URLs

After both services are deployed:

1. **Get Backend URL**:
   - Go to backend service in Railway
   - Copy the public URL (e.g., `https://backend-production.up.railway.app`)

2. **Update Frontend Environment Variable**:
   - Go to frontend service → Variables
   - Update `VITE_API_URL` with backend URL
   - Redeploy frontend service (Railway will rebuild)

3. **Update Backend Environment Variable**:
   - Go to backend service → Variables
   - Get frontend URL (e.g., `https://frontend-production.up.railway.app`)
   - Set `FRONTEND_URL` to frontend URL
   - Redeploy backend service

### Step 7: Verify Deployment

1. **Backend Health Check**:
   ```bash
   curl https://your-backend-url.railway.app/api/v1/health
   ```

2. **Frontend**:
   - Visit frontend URL in browser
   - Should load the application

3. **API Documentation**:
   - Visit `https://your-backend-url.railway.app/api/docs`
   - Should show Swagger UI

## Environment Variables Reference

### Backend Service

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment | `production` |
| `DATABASE_URL` | Auto | PostgreSQL connection (from plugin) | `postgresql://...` |
| `REDIS_URL` | Auto | Redis connection (from plugin) | `redis://...` |
| `JWT_SECRET` | Yes | JWT signing secret | `your-strong-secret` |
| `FRONTEND_URL` | Yes | Frontend URL for CORS | `https://frontend.railway.app` |
| `LOG_LEVEL` | No | Log level | `info` |
| `PORT` | Auto | Port (Railway provides) | `3000` |

### Frontend Service

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment | `production` |
| `VITE_API_URL` | Yes | Backend API URL (build-time) | `https://backend.railway.app` |
| `PORT` | Auto | Port (Railway provides) | `3000` |

## Database Migrations

### Option 1: Manual Migration (Recommended for Production)

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Link to Project**:
   ```bash
   railway link
   ```

3. **Run Migration**:
   ```bash
   cd apps/backend
   railway run npm run migration:run
   ```

### Option 2: Auto-Migration on Startup (Development/Simple Deployments)

**Note**: Not recommended for production, but can be enabled for simple deployments.

Update `apps/backend/src/app.module.ts`:
```typescript
synchronize: process.env.AUTO_MIGRATE === 'true', // Only if explicitly enabled
```

Then set environment variable:
```
AUTO_MIGRATE=true
```

**Warning**: This can cause data loss in production. Use with caution.

### Option 3: Migration Service (Future Enhancement)

Create a separate Railway service that runs migrations before the main backend starts.

## Custom Domains

1. Go to your service in Railway
2. Click "Settings" → "Domains"
3. Click "Generate Domain" or "Custom Domain"
4. For custom domain:
   - Add your domain
   - Configure DNS records as instructed
   - Railway provides automatic SSL certificates

## Monitoring and Logs

### View Logs

1. **Railway Dashboard**:
   - Go to service → "Deployments" tab
   - Click on a deployment
   - View real-time logs

2. **Railway CLI**:
   ```bash
   railway logs
   railway logs --service backend
   ```

### Metrics

Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Request metrics

Access via service dashboard → "Metrics" tab.

## Cost Optimization

### Railway Pricing Model

- **Free Tier**: $5 credit/month
- **Pay-as-you-go**: Based on resource usage
- **Hobby Plan**: $20/month (includes more resources)

### Cost Optimization Tips

1. **Use Sleep Feature**:
   - Non-production services can sleep when idle
   - Saves costs during development

2. **Monitor Resource Usage**:
   - Check service metrics regularly
   - Adjust resource limits if needed

3. **Optimize Docker Images**:
   - Use multi-stage builds (already implemented)
   - Minimize image size

4. **Use Railway's Build Cache**:
   - Railway caches Docker layers
   - Faster builds = lower costs

5. **Database and Redis**:
   - Use Railway's managed services (cost-effective)
   - Scale down when not in use

## Troubleshooting

### npm ci Error (Package Lock Out of Sync)

**Error**: `npm ci can only install packages when your package.json and package-lock.json are in sync`

**Solution**:
1. Update lock files locally:
   ```bash
   npm install
   ```
2. Commit the updated lock files:
   ```bash
   git add package-lock.json apps/*/package-lock.json
   git commit -m "Update package-lock.json files"
   git push
   ```
3. Redeploy on Railway

**Alternative**: If you can't update lock files immediately, you can temporarily change the build command in Railway to:
```bash
npm install && npm run build
```
But this is not recommended for production as it's slower and less deterministic.

### Backend Won't Start

**Check**:
1. Environment variables are set correctly
2. `DATABASE_URL` and `REDIS_URL` are available
3. `JWT_SECRET` is set
4. Build logs for errors

**Common Issues**:
- Missing environment variables
- Database connection timeout
- Redis connection failure
- Port binding issues

### Frontend Build Fails

**Check**:
1. `VITE_API_URL` is set before build
2. Build logs for specific errors
3. Node version compatibility

**Common Issues**:
- Missing `VITE_API_URL`
- Build-time environment variable not set
- Dependency installation failures

### Database Connection Errors

**Check**:
1. PostgreSQL service is running
2. `DATABASE_URL` is correctly formatted
3. Database credentials are valid
4. Network connectivity between services

**Solution**:
- Verify `DATABASE_URL` in service variables
- Check PostgreSQL service status
- Ensure services are in the same Railway project

### Redis Connection Errors

**Check**:
1. Redis service is running
2. `REDIS_URL` is correctly formatted
3. Redis password is included in URL
4. TLS configuration if using `rediss://`

**Solution**:
- Verify `REDIS_URL` in service variables
- Check Redis service status
- Ensure password is in connection string

### CORS Errors

**Check**:
1. `FRONTEND_URL` matches actual frontend URL
2. No trailing slash in `FRONTEND_URL`
3. Backend service is accessible

**Solution**:
- Update `FRONTEND_URL` in backend environment variables
- Redeploy backend service
- Check browser console for specific CORS error

## Security Best Practices

1. **Environment Variables**:
   - Never commit secrets to repository
   - Use Railway's environment variables
   - Rotate secrets regularly

2. **Database**:
   - Use Railway's private networking
   - Enable SSL connections (automatic with Railway)
   - Regular backups

3. **Redis**:
   - Use strong passwords
   - Enable TLS if available
   - Use Railway's private networking

4. **HTTPS**:
   - Railway provides automatic HTTPS
   - Use custom domains with SSL
   - Enforce HTTPS in application

5. **CORS**:
   - Only allow specific frontend URLs
   - Don't use wildcard origins in production
   - Verify `FRONTEND_URL` is correct

## CI/CD Integration

### Automatic Deployments

Railway automatically deploys on:
- Push to main/master branch
- Manual trigger from dashboard
- Railway CLI deployment

### Branch Deployments

1. Create a new service for staging
2. Connect to a different branch (e.g., `staging`)
3. Use separate environment variables
4. Test before merging to production

### Deployment Hooks

Railway supports:
- Pre-deploy scripts
- Post-deploy scripts
- Health checks
- Rollback on failure

## Backup and Recovery

### Database Backups

1. **Railway Automatic Backups**:
   - Railway provides automatic backups for PostgreSQL
   - Access via PostgreSQL service → Backups

2. **Manual Backup**:
   ```bash
   railway run pg_dump $DATABASE_URL > backup.sql
   ```

3. **Restore**:
   ```bash
   railway run psql $DATABASE_URL < backup.sql
   ```

### Application State

- Database: Backed up by Railway
- Redis: Ephemeral (consider persistence if needed)
- Application code: In Git repository

## Scaling

### Horizontal Scaling

Railway supports:
- Multiple instances per service
- Load balancing (automatic)
- Health checks for instance management

### Vertical Scaling

- Adjust CPU and memory limits
- Railway provides resource recommendations
- Monitor metrics to optimize

## Rollback

1. Go to service → "Deployments"
2. Find previous successful deployment
3. Click "Redeploy"
4. Railway will rollback to that version

## Maintenance

### Updates

1. Push changes to GitHub
2. Railway automatically builds and deploys
3. Monitor deployment logs
4. Verify health checks pass

### Database Migrations

1. Create migration files
2. Test locally
3. Run migrations via Railway CLI
4. Verify in production

## Support and Resources

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: Community support
- **Railway Status**: [status.railway.app](https://status.railway.app)

## Future Enhancements

1. **Staging Environment**: Separate staging deployment
2. **CI/CD Pipeline**: GitHub Actions integration
3. **Monitoring**: Integrate with monitoring services
4. **CDN**: Add CDN for frontend static assets
5. **Database Migrations**: Automated migration service
6. **Backup Automation**: Scheduled backup jobs
7. **Multi-region**: Deploy to multiple regions
8. **Blue-Green Deployments**: Zero-downtime deployments

## Conclusion

Railway provides a simple, cost-effective way to deploy the Strategy application. The managed PostgreSQL and Redis services eliminate infrastructure management overhead, while the automatic deployments and health checks ensure reliable operation.

The deployment is production-ready with:
- ✅ Automatic HTTPS
- ✅ Health checks
- ✅ Environment variable management
- ✅ Log aggregation
- ✅ Metrics and monitoring
- ✅ Easy scaling
- ✅ Simple rollback

