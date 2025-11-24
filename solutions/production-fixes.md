# Production Fixes Required

## 1. CORS Configuration

**Issue**: CORS is hardcoded to `localhost:5173`

**Fix**: Make CORS configurable via environment variable

```typescript
// apps/backend/src/main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});
```

## 2. Redis Password Security

**Issue**: Default password 'redis' is used if not set

**Fix**: Require password in production, fail fast if missing

```typescript
// apps/backend/src/common/storage/redis-throttler.storage.ts
constructor() {
  const redisPassword = process.env.REDIS_PASSWORD;
  
  if (process.env.NODE_ENV === 'production' && !redisPassword) {
    throw new Error('REDIS_PASSWORD is required in production');
  }
  
  // ... rest of config
}
```

## 3. JWT Secret Security

**Issue**: Weak default JWT secret

**Fix**: Require strong secret in production

```typescript
// apps/backend/src/modules/auth/auth.module.ts
JwtModule.register({
  secret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    return 'your-secret-key-change-in-production';
  })(),
  signOptions: { expiresIn: '24h' },
}),
```

## 4. Redis Connection Pooling

**Issue**: Single Redis connection may not scale

**Fix**: Use Redis connection pool for better performance

```typescript
// Consider using Redis Cluster or connection pooling for high traffic
// For now, single connection is fine for most use cases
// Can be enhanced later with Redis Cluster
```

## 5. Monitoring and Logging

**Issue**: No metrics for rate limit violations

**Fix**: Add structured logging and metrics

```typescript
// Add to CustomThrottlerGuard
protected async throwThrottlingException(...) {
  // Log rate limit violation
  this.logger.warn('Rate limit exceeded', {
    ip: req.ip,
    userId: req.user?.userId,
    endpoint: context.getHandler().name,
  });
  
  // Could integrate with monitoring service (e.g., Prometheus, DataDog)
  // metrics.increment('rate_limit.violations', { endpoint, ... });
}
```

## 6. Graceful Shutdown

**Issue**: Redis connection may not close properly on shutdown

**Fix**: Already implemented via `onModuleDestroy`, but ensure proper signal handling

```typescript
// apps/backend/src/main.ts
process.on('SIGTERM', async () => {
  await app.close();
});

process.on('SIGINT', async () => {
  await app.close();
});
```

## 7. Rate Limit Configuration

**Issue**: Rate limits are hardcoded

**Fix**: Make configurable via environment variables (optional enhancement)

```typescript
// Could make rate limits configurable:
// RATE_LIMIT_SHORT_TTL=60000
// RATE_LIMIT_SHORT_LIMIT=10
// etc.
```

## Priority

1. **High Priority** (Security):
   - CORS configuration
   - Redis password validation
   - JWT secret validation

2. **Medium Priority** (Reliability):
   - Graceful shutdown
   - Connection pooling (if needed)

3. **Low Priority** (Observability):
   - Monitoring/logging
   - Configurable rate limits

