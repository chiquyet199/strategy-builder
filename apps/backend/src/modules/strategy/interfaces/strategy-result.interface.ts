/**
 * Transaction record for a strategy purchase
 */
export interface Transaction {
  date: string; // ISO 8601
  price: number; // Price at which the asset was purchased
  amount: number; // USD amount invested
  quantityPurchased: number; // Amount of asset purchased
  reason?: string; // Optional reason for the purchase (e.g., "RSI < 30", "Dip detected")
  portfolioValue: {
    coinValue: number; // Value of coin holdings (quantityHeld * price)
    usdcValue: number; // Value of USDC holdings (remaining cash)
    totalValue: number; // Total portfolio value (coinValue + usdcValue)
    quantityHeld: number; // Total quantity of coin held after this transaction
  };
}

/**
 * Portfolio value at a point in time
 */
export interface PortfolioValuePoint {
  date: string; // ISO 8601
  value: number; // Portfolio value in USD
  quantityHeld: number; // Amount of asset held
  price: number; // Asset price at this point
}

/**
 * Strategy calculation metrics
 */
export interface StrategyMetrics {
  totalReturn: number; // Percentage return
  avgBuyPrice: number; // Average purchase price
  maxDrawdown: number; // Maximum drawdown percentage
  finalValue: number; // Final portfolio value in USD
  sharpeRatio: number; // Sharpe ratio (risk-adjusted return)
  totalInvestment: number; // Total USD invested
  totalQuantity: number; // Total asset quantity accumulated
}

/**
 * Complete strategy calculation result
 */
export interface StrategyResult {
  strategyId: string;
  strategyName: string;
  variantName?: string; // Custom name for parameter variant comparisons
  parameters: Record<string, any>; // Parameters used for this calculation
  transactions: Transaction[];
  metrics: StrategyMetrics;
  portfolioValueHistory: PortfolioValuePoint[];
}
