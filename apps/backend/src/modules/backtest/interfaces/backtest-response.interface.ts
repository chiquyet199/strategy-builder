import { StrategyResult } from '../../strategy/interfaces/strategy-result.interface';

/**
 * Backtest comparison response
 */
export interface BacktestResponse {
  results: StrategyResult[];
  metadata: {
    investmentAmount: number;
    startDate: string;
    endDate: string;
    timeframe: string;
    calculatedAt: string;
  };
}

