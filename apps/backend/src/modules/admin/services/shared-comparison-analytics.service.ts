import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedComparison } from '../../backtest/entities/shared-comparison.entity';

export interface PopularShare {
  shortCode: string;
  viewCount: number;
  lastViewedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class SharedComparisonAnalyticsService {
  private readonly logger = new Logger(SharedComparisonAnalyticsService.name);

  constructor(
    @InjectRepository(SharedComparison)
    private readonly sharedComparisonRepository: Repository<SharedComparison>,
  ) {}

  /**
   * Track a share view
   */
  async trackShareView(shortCode: string): Promise<void> {
    try {
      await this.sharedComparisonRepository.update(
        { shortCode },
        {
          viewCount: () => 'viewCount + 1',
          lastViewedAt: new Date(),
        },
      );
    } catch (error) {
      // Log error but don't fail the request
      this.logger.error(
        `Failed to track share view for ${shortCode}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get popular shared comparisons
   */
  async getPopularShares(limit: number = 10): Promise<PopularShare[]> {
    const shares = await this.sharedComparisonRepository.find({
      order: { viewCount: 'DESC' },
      take: limit,
      select: ['shortCode', 'viewCount', 'lastViewedAt', 'createdAt'],
    });

    return shares.map((share) => ({
      shortCode: share.shortCode,
      viewCount: share.viewCount,
      lastViewedAt: share.lastViewedAt,
      createdAt: share.createdAt,
    }));
  }

  /**
   * Get statistics for a specific share
   */
  async getShareStats(shortCode: string): Promise<{
    viewCount: number;
    lastViewedAt: Date | null;
    createdAt: Date;
  } | null> {
    const share = await this.sharedComparisonRepository.findOne({
      where: { shortCode },
      select: ['viewCount', 'lastViewedAt', 'createdAt'],
    });

    if (!share) {
      return null;
    }

    return {
      viewCount: share.viewCount,
      lastViewedAt: share.lastViewedAt,
      createdAt: share.createdAt,
    };
  }
}

