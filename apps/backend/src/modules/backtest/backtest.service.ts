import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';
import { StrategyService } from '../strategy/strategy.service';
import { CompareStrategiesDto } from './dto/compare-strategies.dto';
import { BacktestResponse } from './interfaces/backtest-response.interface';
import { InitialPortfolio, FundingSchedule } from '../strategy/interfaces/strategy-result.interface';

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
    // Normalize input: convert old format (investmentAmount) to new format (initialPortfolio) if needed
    const initialPortfolio: InitialPortfolio = dto.initialPortfolio
      ? {
          assets: dto.initialPortfolio.assets.map((a) => ({ symbol: a.symbol, quantity: a.quantity })),
          usdcAmount: dto.initialPortfolio.usdcAmount,
        }
      : {
          assets: [], // Simple mode: no initial assets
          usdcAmount: dto.investmentAmount || 0,
        };

    if (!dto.initialPortfolio && !dto.investmentAmount) {
      throw new BadRequestException('Either investmentAmount or initialPortfolio must be provided');
    }

    // Normalize funding schedule (only include if amount > 0)
    const fundingSchedule: FundingSchedule | undefined =
      dto.fundingSchedule && dto.fundingSchedule.amount > 0
        ? {
            frequency: dto.fundingSchedule.frequency || 'weekly',
            amount: dto.fundingSchedule.amount,
          }
        : undefined;

    // Calculate total initial investment for metadata (assets value + USDC)
    const timeframe = dto.timeframe || '1d';
    const candles = await this.marketDataService.getCandles(
      'BTC/USD',
      timeframe,
      dto.startDate,
      dto.endDate,
    );

    if (candles.length === 0) {
      throw new Error('No market data available for the specified date range');
    }

    // Calculate total initial value from portfolio
    const firstCandlePrice = candles[0].close;
    const btcAsset = initialPortfolio.assets.find((a) => a.symbol === 'BTC');
    const btcValue = (btcAsset?.quantity || 0) * firstCandlePrice;
    const totalInitialValue = btcValue + initialPortfolio.usdcAmount;

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

    return {
      results,
      metadata: {
        investmentAmount: totalInitialValue, // For backward compatibility
        startDate: dto.startDate,
        endDate: dto.endDate,
        timeframe,
        calculatedAt: new Date().toISOString(),
      },
    };
  }
}

