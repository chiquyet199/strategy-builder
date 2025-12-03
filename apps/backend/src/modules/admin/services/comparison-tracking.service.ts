import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { ComparisonRun } from '../entities/comparison-run.entity';
import { BacktestResponse } from '../../backtest/interfaces/backtest-response.interface';
import { CompareStrategiesDto } from '../../backtest/dto/compare-strategies.dto';

export interface PopularStrategy {
  strategyId: string;
  count: number;
  avgReturn: number;
  maxReturn: number;
}

export interface TopPerformingStrategy {
  strategyId: string;
  strategyName: string;
  variantName?: string;
  totalReturn: number;
  finalValue: number;
  createdAt: Date;
}

export interface DashboardStats {
  totalComparisons: number;
  uniqueStrategies: number;
  avgBestReturn: number;
  mostPopularStrategy: string;
  recentActivityCount: number;
}

@Injectable()
export class ComparisonTrackingService {
  private readonly logger = new Logger(ComparisonTrackingService.name);

  constructor(
    @InjectRepository(ComparisonRun)
    private readonly comparisonRunRepository: Repository<ComparisonRun>,
  ) {}

  /**
   * Track a comparison run
   */
  async trackComparison(
    dto: CompareStrategiesDto,
    response: BacktestResponse,
    userId?: string | null,
  ): Promise<void> {
    try {
      // Extract summary metrics from results
      const results = response.results.map((result) => ({
        strategyId: result.strategyId,
        strategyName: result.strategyName,
        variantName: result.variantName,
        totalReturn: result.metrics.totalReturn,
        finalValue: result.metrics.finalValue,
        avgBuyPrice: result.metrics.avgBuyPrice,
        maxDrawdown: result.metrics.maxDrawdown,
        sharpeRatio: result.metrics.sharpeRatio,
        totalInvestment: result.metrics.totalInvestment,
        totalQuantity: result.metrics.totalQuantity,
      }));

      // Find best performing strategy
      const bestResult = results.reduce((best, current) =>
        current.totalReturn > best.totalReturn ? current : best,
      );

      // Prepare initial portfolio and funding schedule for storage
      const initialPortfolio = dto.initialPortfolio
        ? {
            assets: dto.initialPortfolio.assets,
            usdcAmount: dto.initialPortfolio.usdcAmount,
          }
        : null;

      const fundingSchedule = dto.fundingSchedule
        ? {
            frequency: dto.fundingSchedule.frequency,
            amount: dto.fundingSchedule.amount,
          }
        : null;

      const comparisonRun = this.comparisonRunRepository.create({
        userId: userId || null,
        strategies: dto.strategies.map((s) => s.strategyId),
        startDate: dto.startDate.split('T')[0], // Extract date part
        endDate: dto.endDate.split('T')[0],
        timeframe: dto.timeframe || '1d',
        investmentAmount: dto.investmentAmount || null,
        initialPortfolio,
        fundingSchedule,
        results,
        bestStrategyId: bestResult.strategyId,
        bestReturn: bestResult.totalReturn,
      });

      await this.comparisonRunRepository.save(comparisonRun);

      this.logger.debug(
        `Tracked comparison run: ${comparisonRun.id}, best strategy: ${bestResult.strategyId} (${bestResult.totalReturn}%)`,
      );
    } catch (error) {
      // Log error but don't fail the comparison request
      this.logger.error(
        `Failed to track comparison: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get most popular strategies (by usage count)
   */
  async getPopularStrategies(
    limit: number = 10,
    timeRange?: { start: Date; end: Date },
  ): Promise<PopularStrategy[]> {
    try {
      // Use raw SQL for JSONB array operations
      let sql = `
        SELECT 
          strategy_elem as "strategyId",
          COUNT(*) as count,
          AVG(run."bestReturn") as "avgReturn",
          MAX(run."bestReturn") as "maxReturn"
        FROM comparison_runs run,
        LATERAL jsonb_array_elements_text(run.strategies) as strategy_elem
      `;

      const params: any[] = [];
      if (timeRange) {
        sql += ` WHERE run."createdAt" BETWEEN $1 AND $2`;
        params.push(timeRange.start, timeRange.end);
      }

      sql += `
        GROUP BY strategy_elem
        ORDER BY count DESC
        LIMIT $${params.length + 1}
      `;
      params.push(limit);

      const results = await this.comparisonRunRepository.query(sql, params);

      return results.map((row: any) => ({
        strategyId: row.strategyId,
        count: parseInt(row.count, 10),
        avgReturn: parseFloat(row.avgReturn) || 0,
        maxReturn: parseFloat(row.maxReturn) || 0,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting popular strategies: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get top performing strategies (by return)
   */
  async getTopPerformingStrategies(
    limit: number = 10,
    timeRange?: { start: Date; end: Date },
  ): Promise<TopPerformingStrategy[]> {
    const query = this.comparisonRunRepository
      .createQueryBuilder('run')
      .select('run.bestStrategyId', 'strategyId')
      .addSelect('run.bestReturn', 'totalReturn')
      .addSelect('run.createdAt', 'createdAt')
      .addSelect(
        "(run.results -> 0 ->> 'strategyName')",
        'strategyName',
      )
      .addSelect(
        "(run.results -> 0 ->> 'variantName')",
        'variantName',
      )
      .addSelect(
        "(run.results -> 0 ->> 'finalValue')",
        'finalValue',
      )
      .orderBy('run.bestReturn', 'DESC')
      .limit(limit);

    if (timeRange) {
      query.where('run.createdAt BETWEEN :start AND :end', {
        start: timeRange.start,
        end: timeRange.end,
      });
    }

    const results = await query.getRawMany();

    return results.map((row) => ({
      strategyId: row.strategyId,
      strategyName: row.strategyName || row.strategyId,
      variantName: row.variantName || undefined,
      totalReturn: parseFloat(row.totalReturn) || 0,
      finalValue: parseFloat(row.finalValue) || 0,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Get recent comparisons
   */
  async getRecentComparisons(limit: number = 20): Promise<ComparisonRun[]> {
    return this.comparisonRunRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get statistics for a specific strategy
   */
  async getStrategyStats(
    strategyId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<{
    totalRuns: number;
    avgReturn: number;
    maxReturn: number;
    minReturn: number;
    winRate: number; // Percentage of runs where this strategy was the best
  }> {
    // Use raw SQL for JSONB array operations
    let whereClause = `jsonb_array_elements_text(run.strategies) = $1`;
    const params: any[] = [strategyId];

    if (timeRange) {
      whereClause += ` AND run."createdAt" BETWEEN $2 AND $3`;
      params.push(timeRange.start, timeRange.end);
    }

    const totalRunsQuery = `
      SELECT COUNT(DISTINCT run.id) as count
      FROM comparison_runs run
      WHERE ${whereClause}
    `;
    const totalRunsResult = await this.comparisonRunRepository.query(
      totalRunsQuery,
      params,
    );
    const totalRuns = parseInt(totalRunsResult[0]?.count || '0', 10);

    // Get stats for when this strategy was the best
    let bestWhereClause = `run."bestStrategyId" = $1`;
    const bestParams: any[] = [strategyId];
    if (timeRange) {
      bestWhereClause += ` AND run."createdAt" BETWEEN $2 AND $3`;
      bestParams.push(timeRange.start, timeRange.end);
    }

    const avgQuery = `
      SELECT 
        AVG(run."bestReturn") as "avgReturn",
        MAX(run."bestReturn") as "maxReturn",
        MIN(run."bestReturn") as "minReturn"
      FROM comparison_runs run
      WHERE ${bestWhereClause}
    `;
    const avgResult = await this.comparisonRunRepository.query(
      avgQuery,
      bestParams,
    );

    const winsQuery = `
      SELECT COUNT(*) as count
      FROM comparison_runs run
      WHERE ${bestWhereClause}
    `;
    const winsResult = await this.comparisonRunRepository.query(
      winsQuery,
      bestParams,
    );
    const wins = parseInt(winsResult[0]?.count || '0', 10);
    const winRate = totalRuns > 0 ? (wins / totalRuns) * 100 : 0;

    return {
      totalRuns,
      avgReturn: parseFloat(avgResult[0]?.avgReturn) || 0,
      maxReturn: parseFloat(avgResult[0]?.maxReturn) || 0,
      minReturn: parseFloat(avgResult[0]?.minReturn) || 0,
      winRate,
    };
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(
    timeRange?: { start: Date; end: Date },
  ): Promise<DashboardStats> {
    try {
      const params: any[] = [];
      let whereClause = '';

      if (timeRange) {
        whereClause = `WHERE run."createdAt" BETWEEN $1 AND $2`;
        params.push(timeRange.start, timeRange.end);
      }

      // Get total comparisons
      const totalQuery = `
        SELECT COUNT(*) as count
        FROM comparison_runs run
        ${whereClause}
      `;
      const totalResult = await this.comparisonRunRepository.query(
        totalQuery,
        params,
      );
      const totalComparisons = parseInt(totalResult[0]?.count || '0', 10);

      // Get unique strategies count - use subquery to handle empty results
      const uniqueStrategiesQuery = `
        SELECT COUNT(DISTINCT strategy) as count
        FROM (
          SELECT jsonb_array_elements_text(run.strategies) as strategy
          FROM comparison_runs run
          ${whereClause}
        ) as strategies
      `;
      const uniqueStrategiesResult = await this.comparisonRunRepository.query(
        uniqueStrategiesQuery,
        params,
      );
      const uniqueStrategies = parseInt(
        uniqueStrategiesResult[0]?.count || '0',
        10,
      );

      // Get average best return
      const avgReturnQuery = `
        SELECT AVG(run."bestReturn") as "avgReturn"
        FROM comparison_runs run
        ${whereClause}
      `;
      const avgReturnResult = await this.comparisonRunRepository.query(
        avgReturnQuery,
        params,
      );
      const avgBestReturn = parseFloat(avgReturnResult[0]?.avgReturn) || 0;

      const popularStrategies = await this.getPopularStrategies(1, timeRange);
      const mostPopularStrategy =
        popularStrategies.length > 0 ? popularStrategies[0].strategyId : 'N/A';

      const recentCount = timeRange
        ? totalComparisons
        : await this.comparisonRunRepository.count({
            where: {
              createdAt: Between(
                new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                new Date(),
              ),
            },
          });

      return {
        totalComparisons,
        uniqueStrategies,
        avgBestReturn,
        mostPopularStrategy,
        recentActivityCount: recentCount,
      };
    } catch (error) {
      this.logger.error(
        `Error getting dashboard stats: ${error.message}`,
        error.stack,
      );
      // Return default values on error
      return {
        totalComparisons: 0,
        uniqueStrategies: 0,
        avgBestReturn: 0,
        mostPopularStrategy: 'N/A',
        recentActivityCount: 0,
      };
    }
  }

  /**
   * Cleanup old data based on retention period
   */
  async cleanupOldData(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.comparisonRunRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    const deletedCount = result.affected || 0;
    if (deletedCount > 0) {
      this.logger.log(
        `Cleaned up ${deletedCount} comparison runs older than ${retentionDays} days`,
      );
    }

    return deletedCount;
  }

  /**
   * Get paginated comparison runs
   */
  async getComparisonRuns(
    page: number = 1,
    limit: number = 20,
    timeRange?: { start: Date; end: Date },
  ): Promise<{ data: ComparisonRun[]; total: number; page: number; limit: number }> {
    const query = this.comparisonRunRepository.createQueryBuilder('run');

    if (timeRange) {
      query.where('run.createdAt BETWEEN :start AND :end', {
        start: timeRange.start,
        end: timeRange.end,
      });
    }

    const [data, total] = await query
      .orderBy('run.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }
}

