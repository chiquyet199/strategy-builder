# Production Readiness Checklist

## Environment Variables

Create a `.env` file in `apps/backend/` with the following variables:

```env
# Application Environment
NODE_ENV=production

# Database Configuration
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-db-user
DB_PASSWORD=your-strong-db-password
DB_NAME=strategy

# JWT Configuration
# Generate with: openssl rand -base64 32
JWT_SECRET=your-strong-random-secret-key

# Redis Configuration (for rate limiting)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-strong-redis-password

# Frontend URL (for CORS and email links)
FRONTEND_URL=https://your-frontend-domain.com

# Email Configuration
EMAIL_FROM=noreply@your-domain.com
```

## Production Issues to Address

### ✅ Already Implemented
- [x] Redis-based distributed rate limiting
- [x] Rate limit headers (X-RateLimit-*)
- [x] IP and user-based tracking
- [x] Retry-After header
- [x] Graceful Redis connection handling
- [x] Error handling for Redis failures

### ⚠️ Needs Production Configuration

1. **CORS Configuration** - Currently hardcoded to localhost
2. **Redis Password** - Default password should not be used in production
3. **JWT Secret** - Weak default secret
4. **Environment-based Configuration** - Some values are hardcoded
5. **Connection Pooling** - Redis connection could use pooling
6. **Monitoring** - No metrics/logging for rate limit violations
7. **Graceful Shutdown** - Redis cleanup on shutdown

### 🔧 Recommended Fixes

See `production-fixes.md` for implementation details.

