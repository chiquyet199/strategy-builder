import { CompareStrategiesDto } from '../dto/compare-strategies.dto';
import { InitialPortfolio, FundingSchedule } from '../../strategy/interfaces/strategy-result.interface';

/**
 * Pure functions for normalizing DTOs
 * These functions have no side effects and are easily testable
 */

/**
 * Normalize initial portfolio from DTO
 * Converts old format (investmentAmount) to new format (initialPortfolio) if needed
 * @param dto - Compare strategies DTO
 * @returns Normalized InitialPortfolio
 */
export function normalizeInitialPortfolio(
  dto: CompareStrategiesDto,
): InitialPortfolio {
  if (dto.initialPortfolio) {
    return {
      assets: dto.initialPortfolio.assets.map((a) => ({
        symbol: a.symbol,
        quantity: a.quantity,
      })),
      usdcAmount: dto.initialPortfolio.usdcAmount,
    };
  }

  // Simple mode: no initial assets, just USDC
  return {
    assets: [],
    usdcAmount: dto.investmentAmount || 0,
  };
}

/**
 * Normalize funding schedule from DTO
 * Only includes funding schedule if amount > 0
 * @param dto - Compare strategies DTO
 * @returns Normalized FundingSchedule or undefined
 */
export function normalizeFundingSchedule(
  dto: CompareStrategiesDto,
): FundingSchedule | undefined {
  if (dto.fundingSchedule && dto.fundingSchedule.amount > 0) {
    return {
      frequency: dto.fundingSchedule.frequency || 'weekly',
      amount: dto.fundingSchedule.amount,
    };
  }
  return undefined;
}

/**
 * Calculate total initial investment value from portfolio
 * @param initialPortfolio - Initial portfolio configuration
 * @param firstCandlePrice - Price of the first candle (for asset valuation)
 * @returns Total initial investment value
 */
export function calculateTotalInitialValue(
  initialPortfolio: InitialPortfolio,
  firstCandlePrice: number,
): number {
  const btcAsset = initialPortfolio.assets.find((a) => a.symbol === 'BTC');
  const btcValue = (btcAsset?.quantity || 0) * firstCandlePrice;
  return btcValue + initialPortfolio.usdcAmount;
}

