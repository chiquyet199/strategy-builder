import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';
import { StrategyService } from '../strategy/strategy.service';
import { CompareStrategiesDto } from './dto/compare-strategies.dto';
import { BacktestResponse } from './interfaces/backtest-response.interface';

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly strategyService: StrategyService,
  ) {}

  /**
   * Compare multiple strategies
   */
  async compareStrategies(dto: CompareStrategiesDto): Promise<BacktestResponse> {
    this.logger.log(
      `Comparing ${dto.strategies.length} strategies for $${dto.investmentAmount} from ${dto.startDate} to ${dto.endDate}`,
    );

    const timeframe = dto.timeframe || '1d';

    // Fetch market data
    const candles = await this.marketDataService.getCandles(
      'BTC/USD',
      timeframe,
      dto.startDate,
      dto.endDate,
    );

    if (candles.length === 0) {
      throw new Error('No market data available for the specified date range');
    }

    // Calculate each strategy
    const results = await Promise.all(
      dto.strategies.map(async (strategyConfig) => {
        try {
          const result = await this.strategyService.calculateStrategy(
            strategyConfig.strategyId,
            candles,
            dto.investmentAmount,
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

    return {
      results,
      metadata: {
        investmentAmount: dto.investmentAmount,
        startDate: dto.startDate,
        endDate: dto.endDate,
        timeframe,
        calculatedAt: new Date().toISOString(),
      },
    };
  }
}

