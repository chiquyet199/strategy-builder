/**
 * Backend type definitions for backtest module
 */

export type Timeframe = '1h' | '4h' | '1d' | '1w' | '1m';

export interface Candlestick {
  timestamp: string; // ISO 8601
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timeframe: Timeframe;
}

export interface Transaction {
  date: string; // ISO 8601
  price: number;
  amount: number; // USD
  quantityPurchased: number; // Amount of asset purchased
  reason?: string;
}

export interface PortfolioValuePoint {
  date: string; // ISO 8601
  value: number; // USD
  quantityHeld: number; // Amount of asset held
  price: number;
}

export interface StrategyMetrics {
  totalReturn: number; // Percentage
  avgBuyPrice: number;
  maxDrawdown: number; // Percentage
  finalValue: number; // USD
  sharpeRatio: number;
  totalInvestment: number; // USD
  totalQuantity: number; // Total asset quantity accumulated
}

export interface StrategyResult {
  strategyId: string;
  strategyName: string;
  parameters: Record<string, any>; // Parameters used for this calculation
  transactions: Transaction[];
  metrics: StrategyMetrics;
  portfolioValueHistory: PortfolioValuePoint[];
}

export interface StrategyConfig {
  strategyId: string;
  parameters?: Record<string, any>; // Optional strategy-specific parameters
}

export interface CompareStrategiesRequest {
  investmentAmount: number;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  strategies: StrategyConfig[];
  timeframe?: Timeframe; // Default: '1d'
}

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

/**
 * Strategy parameter interfaces (for future customization UI)
 */
export interface RsiDcaParameters {
  rsiPeriod?: number;
  oversoldThreshold?: number;
  overboughtThreshold?: number;
  buyMultiplier?: number;
}

export interface DipBuyerDcaParameters {
  lookbackDays?: number;
  dropThreshold?: number;
  buyMultiplier?: number;
}

export interface MovingAverageDcaParameters {
  maPeriod?: number;
  buyMultiplier?: number;
}

export interface CombinedSmartDcaParameters {
  rsiPeriod?: number;
  oversoldThreshold?: number;
  maPeriod?: number;
  lookbackDays?: number;
  dropThreshold?: number;
  maxMultiplier?: number;
}

/**
 * Available strategies metadata
 */
export interface StrategyMetadata {
  id: string;
  name: string;
}

