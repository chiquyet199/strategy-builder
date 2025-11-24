import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

/**
 * Redis-based throttler storage for distributed rate limiting
 * Implements ThrottlerStorage interface to work with @nestjs/throttler
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private redis: Redis;
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  constructor() {
    // Require password in production
    const redisPassword = process.env.REDIS_PASSWORD;
    if (process.env.NODE_ENV === 'production' && !redisPassword) {
      throw new Error(
        'REDIS_PASSWORD is required in production. Please set it in your environment variables.',
      );
    }

    // Use default password 'redis' for development only
    const password = redisPassword || 'redis';

    const redisConfig: any = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    };

    this.redis = new Redis(redisConfig);

    this.redis.on('error', (err) => {
      this.logger.error({
        message: 'Redis connection error',
        error: err.message,
        stack: err.stack,
      });
      if (err.message.includes('NOAUTH')) {
        this.logger.error(
          'Redis authentication failed. Please check REDIS_PASSWORD environment variable.',
        );
      }
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected for rate limiting');
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis ready for rate limiting');
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const redisKey = `throttler:${key}`;
    const ttlSeconds = Math.ceil(ttl / 1000);
    const blockKey = `throttler:block:${key}`;

    // Check if blocked
    const isBlocked = (await this.redis.get(blockKey)) === '1';
    const timeToBlockExpire = isBlocked
      ? (await this.redis.ttl(blockKey)) * 1000
      : 0;

    // If blocked, return blocked status
    if (isBlocked) {
      return {
        totalHits: limit + 1,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire,
      };
    }

    // Use Redis INCR with TTL
    const totalHits = await this.redis.incr(redisKey);

    // Set TTL on first increment
    if (totalHits === 1) {
      await this.redis.expire(redisKey, ttlSeconds);
    }

    // Get remaining TTL
    const timeToExpire = (await this.redis.ttl(redisKey)) * 1000;

    // Block if limit exceeded
    if (totalHits > limit && blockDuration > 0) {
      const blockSeconds = Math.ceil(blockDuration / 1000);
      await this.redis.setex(blockKey, blockSeconds, '1');
    }

    return {
      totalHits,
      timeToExpire: timeToExpire > 0 ? timeToExpire : 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
