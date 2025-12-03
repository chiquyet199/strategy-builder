import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedComparison } from '../entities/shared-comparison.entity';
import { randomBytes } from 'crypto';
import { SharedComparisonAnalyticsService } from '../../admin/services/shared-comparison-analytics.service';

@Injectable()
export class ShareComparisonService {
  private readonly logger = new Logger(ShareComparisonService.name);
  private readonly SHORT_CODE_LENGTH = 8;

  constructor(
    @InjectRepository(SharedComparison)
    private readonly sharedComparisonRepository: Repository<SharedComparison>,
    @Inject(forwardRef(() => SharedComparisonAnalyticsService))
    private readonly analyticsService?: SharedComparisonAnalyticsService,
  ) {}

  /**
   * Generate a unique short code
   * Uses crypto-safe random generation and checks for uniqueness
   */
  private async generateShortCode(): Promise<string> {
    const maxAttempts = 3;
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Generate random bytes and convert to base64url (URL-safe)
      const randomBytesBuffer = randomBytes(this.SHORT_CODE_LENGTH);
      const shortCode = randomBytesBuffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
        .substring(0, this.SHORT_CODE_LENGTH);

      // Check if code already exists
      const existing = await this.sharedComparisonRepository.findOne({
        where: { shortCode },
      });

      if (!existing) {
        return shortCode;
      }

      attempts++;
      this.logger.warn(
        `Short code collision detected: ${shortCode}. Attempt ${attempts}/${maxAttempts}`,
      );
    }

    throw new Error('Failed to generate unique short code after multiple attempts');
  }

  /**
   * Create a shared comparison and return the short code
   */
  async createSharedComparison(
    config: Record<string, any>,
    expiresInDays?: number,
  ): Promise<string> {
    const shortCode = await this.generateShortCode();

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const sharedComparison = this.sharedComparisonRepository.create({
      shortCode,
      config,
      expiresAt,
    });

    await this.sharedComparisonRepository.save(sharedComparison);

    this.logger.log(`Created shared comparison with short code: ${shortCode}`);

    return shortCode;
  }

  /**
   * Get shared comparison config by short code
   */
  async getSharedComparison(shortCode: string): Promise<Record<string, any>> {
    const sharedComparison = await this.sharedComparisonRepository.findOne({
      where: { shortCode },
    });

    if (!sharedComparison) {
      throw new NotFoundException(`Shared comparison not found: ${shortCode}`);
    }

    // Check if expired
    if (
      sharedComparison.expiresAt &&
      sharedComparison.expiresAt < new Date()
    ) {
      // Optionally delete expired entry
      await this.sharedComparisonRepository.remove(sharedComparison);
      throw new NotFoundException(
        `Shared comparison has expired: ${shortCode}`,
      );
    }

    // Track view for analytics (non-blocking)
    if (this.analyticsService) {
      this.analyticsService
        .trackShareView(shortCode)
        .catch((error) => {
          // Log but don't fail the request
          this.logger.warn(
            `Failed to track share view: ${error.message}`,
          );
        });
    }

    return sharedComparison.config;
  }

  /**
   * Delete expired shared comparisons
   * Can be called by a scheduled job
   */
  async deleteExpiredComparisons(): Promise<number> {
    const result = await this.sharedComparisonRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt IS NOT NULL AND expiresAt < :now', { now: new Date() })
      .execute();

    const deletedCount = result.affected || 0;
    if (deletedCount > 0) {
      this.logger.log(`Deleted ${deletedCount} expired shared comparisons`);
    }

    return deletedCount;
  }
}

