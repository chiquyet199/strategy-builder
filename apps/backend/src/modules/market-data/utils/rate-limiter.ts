import { Logger } from '@nestjs/common';

/**
 * Rate Limiter for Binance API
 * Tracks request weight and request count to respect Binance rate limits
 */
export class BinanceRateLimiter {
  private readonly logger: Logger;
  private readonly maxWeightPerMinute: number;
  private readonly maxRequestsPerMinute: number;
  private readonly requestWeight: number;

  // Request weight tracking
  private weightUsage: Array<{ timestamp: number; weight: number }> = [];
  private requestCount: Array<{ timestamp: number }> = [];

  constructor(
    logger: Logger,
    maxWeightPerMinute: number = 1200,
    maxRequestsPerMinute: number = 1200,
    requestWeight: number = 5,
  ) {
    this.logger = logger;
    this.maxWeightPerMinute = maxWeightPerMinute;
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.requestWeight = requestWeight;
  }

  /**
   * Track a request with its weight
   * @param weight - Request weight (defaults to configured requestWeight)
   */
  trackRequest(weight?: number): void {
    const now = Date.now();
    const requestWeight = weight || this.requestWeight;

    this.weightUsage.push({ timestamp: now, weight: requestWeight });
    this.requestCount.push({ timestamp: now });

    // Clean up old entries (older than 1 minute)
    this.cleanupOldEntries(now);
  }

  /**
   * Track request weight from response headers
   * @param weightHeader - Weight header value from response
   */
  trackRequestFromHeader(weightHeader: string | null): void {
    const now = Date.now();
    const usedWeight = weightHeader
      ? parseInt(weightHeader, 10)
      : this.requestWeight;

    this.weightUsage.push({ timestamp: now, weight: this.requestWeight });
    this.requestCount.push({ timestamp: now });

    // Clean up old entries
    this.cleanupOldEntries(now);

    // Log warning if approaching limits
    this.logWarningsIfNeeded();
  }

  /**
   * Get current weight usage in the last minute
   */
  getCurrentWeightUsage(): number {
    return this.weightUsage.reduce((sum, entry) => sum + entry.weight, 0);
  }

  /**
   * Get current request count in the last minute
   */
  getCurrentRequestCount(): number {
    return this.requestCount.length;
  }

  /**
   * Wait if necessary to respect rate limits
   * @returns Promise that resolves when it's safe to make a request
   */
  async waitForRateLimit(): Promise<void> {
    const currentWeight = this.getCurrentWeightUsage();
    const currentRequests = this.getCurrentRequestCount();

    // Calculate how much weight/requests we can use
    const availableWeight = this.maxWeightPerMinute - currentWeight;
    const availableRequests = this.maxRequestsPerMinute - currentRequests;

    // If we're close to limits, wait
    if (availableWeight < this.requestWeight || availableRequests < 1) {
      // Calculate wait time based on oldest entry
      const oldestEntry = Math.min(
        ...this.weightUsage.map((e) => e.timestamp),
        ...this.requestCount.map((e) => e.timestamp),
      );

      if (oldestEntry) {
        const timeSinceOldest = Date.now() - oldestEntry;
        const waitTime = Math.max(0, 60000 - timeSinceOldest + 100); // Add 100ms buffer

        if (waitTime > 0) {
          this.logger.debug(
            `Rate limit: Waiting ${waitTime}ms (weight: ${currentWeight}/${this.maxWeightPerMinute}, requests: ${currentRequests}/${this.maxRequestsPerMinute})`,
          );
          await this.delay(waitTime);
        }
      } else {
        // Conservative delay if no history
        await this.delay(250); // 4 requests per second max (240 per minute)
      }
    } else {
      // Small delay to avoid hitting limits too quickly
      // With weight=5, we can do 240 requests per minute max
      // That's 4 requests per second, so 250ms delay is safe
      await this.delay(250);
    }
  }

  /**
   * Clean up old entries (older than 1 minute)
   */
  private cleanupOldEntries(now: number): void {
    const oneMinuteAgo = now - 60000;
    this.weightUsage = this.weightUsage.filter(
      (entry) => entry.timestamp > oneMinuteAgo,
    );
    this.requestCount = this.requestCount.filter(
      (entry) => entry.timestamp > oneMinuteAgo,
    );
  }

  /**
   * Log warnings if approaching rate limits
   */
  private logWarningsIfNeeded(): void {
    const currentWeight = this.getCurrentWeightUsage();
    const currentRequests = this.getCurrentRequestCount();

    if (currentWeight > this.maxWeightPerMinute * 0.8) {
      this.logger.warn(
        `Approaching weight limit: ${currentWeight}/${this.maxWeightPerMinute}`,
      );
    }

    if (currentRequests > this.maxRequestsPerMinute * 0.8) {
      this.logger.warn(
        `Approaching request limit: ${currentRequests}/${this.maxRequestsPerMinute}`,
      );
    }
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

