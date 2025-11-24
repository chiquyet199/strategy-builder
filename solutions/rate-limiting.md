# Rate Limiting Solution

## Overview

This document describes the rate limiting implementation for the Strategy application, including technical decisions, architecture, and configuration.

## Date
November 24, 2024

## Problem Statement

The application needed production-ready rate limiting to:
1. Prevent abuse and brute force attacks
2. Protect sensitive endpoints (login, registration, password reset)
3. Ensure fair resource usage across all users
4. Work in distributed/multi-instance deployments
5. Provide clear feedback to clients about rate limits

## Solution Architecture

### Components

1. **Redis Storage** (`RedisThrottlerStorage`)
   - Distributed storage for rate limit counters
   - Works across multiple server instances
   - Persistent storage with TTL-based expiration

2. **Custom Throttler Guard** (`CustomThrottlerGuard`)
   - Extends NestJS ThrottlerGuard
   - Adds rate limit headers to responses
   - Implements IP-based and user-based tracking
   - Provides Retry-After header on rate limit exceeded

3. **Rate Limit Configuration**
   - Multiple throttler profiles (short, medium, long)
   - Endpoint-specific rate limits
   - Different limits for authenticated vs anonymous users

## Technical Decisions

### 1. Why Redis?

**Decision**: Use Redis for distributed rate limiting storage

**Rationale**:
- **Distributed Systems**: In-memory storage doesn't work across multiple server instances
- **Performance**: Redis is optimized for high-throughput operations
- **Persistence**: Data survives server restarts (with persistence enabled)
- **TTL Support**: Built-in expiration support for automatic cleanup
- **Industry Standard**: Widely used in production applications

**Alternatives Considered**:
- In-memory storage: Rejected - doesn't work in distributed deployments
- Database storage: Rejected - too slow for rate limiting use case
- External API gateway: Considered but adds complexity and cost

### 2. Why Custom Guard?

**Decision**: Extend ThrottlerGuard instead of using default

**Rationale**:
- **Rate Limit Headers**: Standard headers (X-RateLimit-*) for client awareness
- **IP/User Tracking**: Differentiate between authenticated and anonymous users
- **Retry-After Header**: Helps clients implement proper backoff strategies
- **Better UX**: Clients can display remaining requests to users

**Implementation Details**:
- IP-based tracking for anonymous users
- User ID-based tracking for authenticated users
- Handles proxied requests (X-Forwarded-For header)

### 3. Rate Limit Profiles

**Decision**: Three-tier rate limiting system

**Configuration**:
```typescript
{
  short: { ttl: 60000, limit: 10 },      // 10 requests per minute
  medium: { ttl: 300000, limit: 20 },    // 20 requests per 5 minutes
  long: { ttl: 3600000, limit: 100 },    // 100 requests per hour
}
```

**Rationale**:
- **Flexibility**: Different endpoints need different limits
- **Security**: Stricter limits on sensitive operations
- **User Experience**: Reasonable limits for normal usage

### 4. Endpoint-Specific Limits

**Decision**: Apply different limits to different endpoints

**Current Limits**:
- **Login**: 5 requests per minute (short profile)
- **Register**: 3 requests per hour (long profile)
- **Forgot Password**: 3 requests per hour (long profile)
- **Reset Password**: 5 requests per 5 minutes (medium profile)
- **Default**: 10 requests per minute (short profile)

**Rationale**:
- **Login**: Frequent legitimate use, but needs protection against brute force
- **Register**: Rare operation, strict limit prevents spam accounts
- **Forgot Password**: Rare operation, strict limit prevents email spam
- **Reset Password**: Moderate limit allows retries but prevents abuse

## Implementation Details

### Redis Configuration

**Connection Settings**:
- Host: `REDIS_HOST` (default: localhost)
- Port: `REDIS_PORT` (default: 6379)
- Password: `REDIS_PASSWORD` (optional, recommended for production)
- Retry Strategy: Exponential backoff with max 2s delay
- Max Retries: 3 per request

**Storage Format**:
- Key: `throttler:{tracker}:{endpoint}:{throttlerName}`
- Value: JSON array of timestamps
- TTL: Set to match throttler TTL

### Rate Limit Headers

**Standard Headers**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: ISO timestamp when limit resets
- `Retry-After`: Seconds until retry is allowed (on 429)

**Example Response**:
```
HTTP/1.1 200 OK
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 2024-11-24T10:30:00.000Z
```

### Tracking Strategy

**Anonymous Users**:
- Track by IP address
- Handles: `req.ip`, `X-Forwarded-For`, `X-Real-IP`
- Format: `ip:{ip_address}`

**Authenticated Users**:
- Track by user ID
- More accurate than IP (handles shared IPs)
- Format: `user:{user_id}`

## Docker Setup

### Redis Service

**Configuration**:
- Image: `redis:7-alpine`
- Port: 6379
- Persistence: AOF (Append Only File) enabled
- Password: Configurable via `REDIS_PASSWORD` env var
- Health Check: Redis PING command

**Volume**:
- Persistent volume for data persistence
- Survives container restarts

### Backend Dependencies

**Environment Variables**:
```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis  # Change in production
```

**Health Checks**:
- Backend waits for Redis to be healthy before starting
- Automatic retry on connection failure

## Production Considerations

### Security

1. **Redis Password**: Always set `REDIS_PASSWORD` in production
2. **Network Isolation**: Redis should not be exposed to public internet
3. **Rate Limit Values**: Adjust based on actual usage patterns
4. **Monitoring**: Monitor rate limit violations for abuse patterns

### Performance

1. **Redis Connection Pooling**: Consider connection pooling for high traffic
2. **Memory Management**: Monitor Redis memory usage
3. **TTL Cleanup**: Automatic cleanup via Redis TTL
4. **Caching**: Rate limit data is already cached in Redis

### Monitoring

**Metrics to Track**:
- Rate limit violations per endpoint
- Most frequently rate-limited IPs/users
- Average requests per user/IP
- Redis connection health

**Alerts**:
- High rate of 429 responses
- Redis connection failures
- Unusual traffic patterns

## Future Enhancements

### Potential Improvements

1. **Sliding Window Algorithm**: More accurate than fixed window
2. **Token Bucket**: Allow bursts while maintaining average rate
3. **Dynamic Limits**: Adjust limits based on user tier/subscription
4. **Whitelist/Blacklist**: Exempt certain IPs or users
5. **Rate Limit Analytics**: Dashboard for rate limit usage
6. **Distributed Tracing**: Track rate limits across microservices

### Migration Path

If we need to change the algorithm or storage:
1. The `ThrottlerStorage` interface is abstracted
2. Can swap Redis implementation without changing guards
3. Custom guard can be extended for new features

## Testing

### Manual Testing

1. **Test Rate Limits**:
   ```bash
   # Test login endpoint (5 req/min)
   for i in {1..6}; do curl -X POST http://localhost:3000/api/v1/auth/login; done
   ```

2. **Check Headers**:
   ```bash
   curl -i -X POST http://localhost:3000/api/v1/auth/login
   ```

3. **Test Redis Connection**:
   ```bash
   docker exec strategy-redis redis-cli ping
   ```

### Automated Testing

- Unit tests for `RedisThrottlerStorage`
- Unit tests for `CustomThrottlerGuard`
- Integration tests for rate limiting behavior
- E2E tests for rate limit headers

## References

- [NestJS Throttler Documentation](https://docs.nestjs.com/security/rate-limiting)
- [Redis Rate Limiting Patterns](https://redis.io/docs/manual/patterns/rate-limiting/)
- [RFC 6585 - 429 Too Many Requests](https://tools.ietf.org/html/rfc6585)
- [Rate Limiting Best Practices](https://www.svix.com/resources/guides/api-rate-limiting-best-practices/)

## Maintenance

### Regular Tasks

1. **Monitor Rate Limit Violations**: Weekly review
2. **Adjust Limits**: Based on usage patterns
3. **Redis Maintenance**: Regular backups and monitoring
4. **Update Dependencies**: Keep @nestjs/throttler and ioredis updated

### Troubleshooting

**Common Issues**:

1. **Redis Connection Failed**
   - Check Redis container is running
   - Verify network connectivity
   - Check credentials

2. **Rate Limits Not Working**
   - Verify Redis storage is being used
   - Check guard is registered
   - Verify endpoint has @Throttle decorator

3. **Headers Not Appearing**
   - Verify CustomThrottlerGuard is used
   - Check response interceptor isn't stripping headers

## Conclusion

This rate limiting implementation provides:
- ✅ Production-ready distributed rate limiting
- ✅ Clear client feedback via headers
- ✅ Protection against abuse and brute force
- ✅ Scalable architecture for future enhancements
- ✅ Industry-standard practices and patterns

The solution balances security, performance, and user experience while maintaining flexibility for future requirements.

