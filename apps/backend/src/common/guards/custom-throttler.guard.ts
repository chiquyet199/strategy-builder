import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Custom Throttler Guard
 * - Adds rate limit headers to responses
 * - Implements IP-based and user-based tracking
 * - Provides Retry-After header on rate limit exceeded
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * Get tracker identifier (IP for anonymous, user ID for authenticated)
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // For authenticated users, use user ID for more accurate tracking
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }

    // For anonymous users, use IP address
    // Handle both direct IP and proxied requests (X-Forwarded-For)
    const ip =
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers?.['x-real-ip'] ||
      'unknown';

    return `ip:${ip}`;
  }

  /**
   * Throw throttling exception with proper headers
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: { limit: number; ttl: number },
  ): Promise<void> {
    const { res } = this.getRequestResponse(context);

    // Calculate remaining time until reset
    const resetTime = Date.now() + throttlerLimitDetail.ttl;
    const retryAfter = Math.ceil(throttlerLimitDetail.ttl / 1000);

    // Add rate limit headers
    res.header('X-RateLimit-Limit', throttlerLimitDetail.limit.toString());
    res.header('X-RateLimit-Remaining', '0');
    res.header('X-RateLimit-Reset', new Date(resetTime).toISOString());
    res.header('Retry-After', retryAfter.toString());

    throw new ThrottlerException(
      `Too many requests. Limit: ${throttlerLimitDetail.limit} requests per ${Math.ceil(throttlerLimitDetail.ttl / 1000)} seconds. Please retry after ${retryAfter} seconds.`,
    );
  }

  /**
   * Override to add rate limit headers to successful responses
   */
  protected async handleRequest(requestProps: any): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration } = requestProps;
    const { req, res } = this.getRequestResponse(context);
    const tracker = await this.getTracker(req);
    const key = this.generateKey(context, tracker, throttler.name);

    // Increment counter in Redis
    const { totalHits, timeToExpire, isBlocked } =
      await this.storageService.increment(
        key,
        ttl,
        limit,
        blockDuration || 0,
        throttler.name,
      );

    const remaining = Math.max(0, limit - totalHits);
    const resetTime = Date.now() + timeToExpire;

    // Add rate limit headers to response
    res.header('X-RateLimit-Limit', limit.toString());
    res.header('X-RateLimit-Remaining', remaining.toString());
    res.header('X-RateLimit-Reset', new Date(resetTime).toISOString());

    // Check if limit exceeded or blocked
    if (isBlocked || totalHits > limit) {
      await this.throwThrottlingException(context, { limit, ttl });
      return false;
    }

    return true;
  }
}
