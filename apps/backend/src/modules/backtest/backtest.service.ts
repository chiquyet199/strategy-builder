import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';
import { StrategyService } from '../strategy/strategy.service';
import { CompareStrategiesDto } from './dto/compare-strategies.dto';
import { BacktestResponse } from './interfaces/backtest-response.interface';
import { BacktestException } from '../../common/exceptions/backtest.exception';
import {
  normalizeInitialPortfolio,
  normalizeFundingSchedule,
  calculateTotalInitialValue,
} from './utils/dto-normalizer';
import { ComparisonTrackingService } from '../admin/services/comparison-tracking.service';

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly strategyService: StrategyService,
    @Inject(forwardRef(() => ComparisonTrackingService))
    private readonly comparisonTrackingService?: ComparisonTrackingService,
  ) {}

  /**
   * Compare multiple investment strategies
   * Normalizes input DTO (supports both old and new formats) and calculates results for each strategy
   * @param dto - Comparison request containing strategies, date range, and investment configuration
   * @returns Backtest results with metrics for each strategy
   * @throws BadRequestException if neither investmentAmount nor initialPortfolio is provided
   * @throws BacktestException if no market data is available for the date range
   */
  async compareStrategies(
    dto: CompareStrategiesDto,
  ): Promise<BacktestResponse> {
    // Validate input
    if (!dto.initialPortfolio && !dto.investmentAmount) {
      throw new BadRequestException(
        'Either investmentAmount or initialPortfolio must be provided',
      );
    }

    // Normalize input using pure functions
    const initialPortfolio = normalizeInitialPortfolio(dto);
    const fundingSchedule = normalizeFundingSchedule(dto);

    // Calculate total initial investment for metadata (assets value + USDC)
    const timeframe = dto.timeframe || '1d';
    const candles = await this.marketDataService.getCandles(
      'BTC/USD',
      timeframe,
      dto.startDate,
      dto.endDate,
    );

    if (candles.length === 0) {
      throw new BacktestException(
        'No market data available for the specified date range',
      );
    }

    // Calculate total initial value from portfolio using pure function
    const firstCandlePrice = candles[0].close;
    const totalInitialValue = calculateTotalInitialValue(
      initialPortfolio,
      firstCandlePrice,
    );

    this.logger.log(
      `Comparing ${dto.strategies.length} strategies with initial portfolio (assets: ${initialPortfolio.assets.length}, USDC: $${initialPortfolio.usdcAmount}) from ${dto.startDate} to ${dto.endDate}`,
    );

    // Calculate each strategy
    const results = await Promise.all(
      dto.strategies.map(async (strategyConfig) => {
        try {
          const result = await this.strategyService.calculateStrategy(
            strategyConfig.strategyId,
            candles,
            initialPortfolio,
            fundingSchedule,
            dto.startDate,
            dto.endDate,
            strategyConfig.parameters,
          );
          // Preserve variant name if provided
          if (strategyConfig.variantName) {
            result.variantName = strategyConfig.variantName;
          }
          return result;
        } catch (error) {
          this.logger.error(
            `Error calculating strategy ${strategyConfig.strategyId}: ${error.message}`,
            error.stack,
          );
          throw error;
        }
      }),
    );

    const response: BacktestResponse = {
      results,
      metadata: {
        investmentAmount: totalInitialValue, // For backward compatibility
        startDate: dto.startDate,
        endDate: dto.endDate,
        timeframe,
        calculatedAt: new Date().toISOString(),
      },
    };

    // Note: Comparison tracking is now only done when user clicks "Share" button
    // This is handled in the ShareComparisonService

    return response;
  }
}
