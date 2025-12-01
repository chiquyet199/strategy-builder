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
  type?: 'buy' | 'sell'; // Transaction type (optional for backward compatibility, defaults to 'buy')
  price: number; // Price at which the asset was bought or sold
  amount: number; // USD value of the transaction (always positive)
  quantityPurchased: number; // Amount of asset: positive for buys, negative for sells
  reason?: string; // Optional reason for the transaction
  portfolioValue: {
    coinValue: number; // Value of coin holdings (quantityHeld * price)
    usdcValue: number; // Value of USDC holdings (remaining cash)
    totalValue: number; // Total portfolio value (coinValue + usdcValue)
    quantityHeld: number; // Total quantity of coin held after this transaction
  };
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

export type ComparisonMode = 'compare-strategies' | 'compare-variants'

export interface StrategyResult {
  strategyId: string;
  strategyName: string;
  variantName?: string; // Custom name for parameter variant comparisons
  parameters: Record<string, any>; // Parameters used for this calculation
  transactions: Transaction[];
  metrics: StrategyMetrics;
  portfolioValueHistory: PortfolioValuePoint[];
}

export interface StrategyConfig {
  strategyId: string;
  variantName?: string; // Custom name for parameter variant comparisons
  parameters?: Record<string, any>; // Optional strategy-specific parameters
}

export interface Variant extends StrategyConfig {
  variantName: string; // Required variant name for parameter variant comparisons
}

export interface Asset {
  symbol: string; // e.g., "BTC", "ETH" (for future multi-asset support)
  quantity: number; // Quantity of the asset
}

export interface InitialPortfolio {
  assets: Asset[]; // Array of assets (e.g., [{symbol: "BTC", quantity: 0.5}])
  usdcAmount: number; // Starting USDC amount
  // Note: "Initial Investment" in UI = InitialPortfolio with assets=[], usdcAmount=investmentAmount
  // Total value is calculated from assets (using startDate price) + usdcAmount
}

export interface FundingSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  amount: number; // USD amount per period
}

export interface CompareStrategiesRequest {
  investmentAmount?: number; // Legacy - use initialPortfolio instead
  initialPortfolio?: InitialPortfolio; // New format
  fundingSchedule?: FundingSchedule; // Optional periodic funding
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

