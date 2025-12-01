/**
 * Asset in a portfolio
 */
export interface Asset {
  symbol: string; // e.g., "BTC", "ETH" (for future multi-asset support)
  quantity: number; // Quantity of the asset
}

/**
 * Initial portfolio configuration
 */
export interface InitialPortfolio {
  assets: Asset[]; // Array of assets (e.g., [{symbol: "BTC", quantity: 0.5}])
  usdcAmount: number; // Starting USDC amount
  // Note: "Initial Investment" in UI = InitialPortfolio with assets=[], usdcAmount=investmentAmount
  // Total value is calculated from assets (using startDate price) + usdcAmount
}

/**
 * Periodic funding schedule
 */
export interface FundingSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  amount: number; // USD amount per period (0 means no funding)
}

/**
 * Transaction record for a strategy purchase or sale
 */
export interface Transaction {
  date: string; // ISO 8601
  type?: 'buy' | 'sell' | 'funding'; // Transaction type (optional for backward compatibility, defaults to 'buy')
  price: number; // Price at which the asset was bought or sold (for funding, this is the current price for portfolio value calculation)
  amount: number; // USD value of the transaction (always positive)
  quantityPurchased: number; // Amount of asset: positive for buys, negative for sells, 0 for funding
  reason?: string; // Optional reason for the transaction (e.g., "RSI < 30", "Rebalancing: BTC allocation 90% > 90% threshold")
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
