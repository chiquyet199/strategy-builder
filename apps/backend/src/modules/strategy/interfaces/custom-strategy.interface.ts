/**
 * Custom Strategy Configuration Interfaces
 * Defines the structure for custom rule-based strategies
 */

/**
 * Custom Strategy Configuration
 */
export interface CustomStrategyConfig {
  name?: string; // Optional strategy name
  rules: CustomRule[]; // Array of rules to execute
}

/**
 * Custom Rule Definition
 */
export interface CustomRule {
  id: string; // Unique rule ID
  priority?: number; // Execution priority (lower = higher priority, default: order in array)
  enabled?: boolean; // Whether rule is enabled (default: true)
  when: WhenCondition; // Conditions that trigger this rule
  then: ThenAction[]; // Actions to execute when conditions are met
}

/**
 * WHEN Conditions (union type)
 */
export type WhenCondition =
  | ScheduleCondition
  | PriceChangeCondition
  | PriceLevelCondition
  | PriceStreakCondition
  | PortfolioValueCondition
  | VolumeChangeCondition
  | IndicatorCondition
  | AndCondition
  | OrCondition;

/**
 * Schedule Condition - Time-based triggers
 */
export interface ScheduleCondition {
  type: 'schedule';
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';
  dayOfMonth?: number; // 1-28
  time?: string; // HH:MM format (optional, not used in Phase 1)
}

/**
 * Price Change Condition - Price movement triggers
 */
export interface PriceChangeCondition {
  type: 'price_change';
  direction: 'drop' | 'rise';
  threshold: number; // 0-1 (e.g., 0.10 = 10%)
  referencePoint: '24h_high' | '7d_high' | '30d_high' | 'ath';
}

export interface PriceLevelCondition {
  type: 'price_level';
  operator: 'above' | 'below' | 'equals';
  price: number; // Absolute price in USD
}

/**
 * Price Streak Condition - Detects consecutive price movements
 */
export interface PriceStreakCondition {
  type: 'price_streak';
  direction: 'drop' | 'rise'; // Direction of the streak
  streakCount: number; // Number of consecutive periods (e.g., 3 = 3 times in a row)
  minChangePercent?: number; // Optional minimum change percentage per period (0-1, e.g., 0.01 = 1%)
}

export interface PortfolioValueCondition {
  type: 'portfolio_value';
  mode: 'absolute' | 'percentage'; // Absolute USD amount or percentage return
  target: number; // Target value (USD amount or percentage 0-1, e.g., 0.5 = 50%)
  operator: 'above' | 'below' | 'equals' | 'reaches'; // How to compare
  referencePoint?: 'initial_investment' | 'total_invested' | 'peak_value'; // For percentage mode
}

export interface VolumeChangeCondition {
  type: 'volume_change';
  operator: 'above' | 'below';
  threshold: number; // Multiplier (e.g., 1.5 = 150% of average)
  lookbackDays: number; // Days to calculate average volume (e.g., 7, 30)
}

/**
 * Indicator Condition - Technical indicator triggers
 * Phase 2: Will be implemented later
 */
export interface IndicatorCondition {
  type: 'indicator';
  indicator: 'rsi' | 'ma' | 'macd' | 'bollinger';
  params: Record<string, any>; // Indicator-specific parameters
  operator:
    | 'less_than'
    | 'greater_than'
    | 'equals'
    | 'crosses_above'
    | 'crosses_below';
  value: number;
}

/**
 * AND Condition - All conditions must be true
 */
export interface AndCondition {
  type: 'and';
  conditions: WhenCondition[];
}

/**
 * OR Condition - At least one condition must be true
 */
export interface OrCondition {
  type: 'or';
  conditions: WhenCondition[];
}

/**
 * THEN Actions (union type)
 */
export type ThenAction =
  | BuyFixedAction
  | BuyPercentageAction
  | BuyScaledAction
  | SellFixedAction
  | SellPercentageAction
  | TakeProfitAction
  | RebalanceAction
  | LimitOrderAction;

/**
 * Buy Fixed Amount Action
 */
export interface BuyFixedAction {
  type: 'buy_fixed';
  amount: number; // USD amount to spend
}

/**
 * Buy Percentage Action
 */
export interface BuyPercentageAction {
  type: 'buy_percentage';
  percentage: number; // 0-1 (e.g., 0.5 = 50% of available cash)
}

export interface BuyScaledAction {
  type: 'buy_scaled';
  baseAmount: number; // Base amount in USD
  scaleFactor: number; // Multiplier based on condition severity (e.g., 2.0 = 2x for deeper dips)
  maxAmount?: number; // Optional maximum amount cap
}

export interface RebalanceAction {
  type: 'rebalance';
  targetAllocation: number; // 0-1 (e.g., 0.8 = 80% BTC, 20% USDC)
  threshold?: number; // Rebalance if allocation is off by this much (default: 0.05 = 5%)
}

export interface SellFixedAction {
  type: 'sell_fixed';
  amount: number; // USD value of BTC to sell
}

export interface SellPercentageAction {
  type: 'sell_percentage';
  percentage: number; // 0-1 (e.g., 0.5 = 50% of BTC holdings)
}

export interface TakeProfitAction {
  type: 'take_profit';
  percentage: number; // 0-1 (e.g., 0.5 = 50% of current holdings to sell for profit)
}

export interface LimitOrderAction {
  type: 'limit_order';
  price: number; // Target price in USD
  amount: number; // Amount to buy when price is reached
  expiresInDays?: number; // Order expires after N days (optional)
}

/**
 * Evaluation Context - Information available when evaluating conditions
 */
export interface EvaluationContext {
  date: string; // ISO 8601 date
  price: number; // Current BTC price
  portfolio: {
    btcQuantity: number;
    usdcAmount: number;
  };
  marketData: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number; // Volume for volume-based conditions
  }>; // Historical data up to current date
  conditionSeverity?: number; // For scaled actions: 0-1 indicating how severe the condition is (e.g., 0.5 = 50% drop)
  initialInvestment?: number; // Initial investment amount (for percentage calculations)
  totalInvested?: number; // Total amount invested including funding (for percentage calculations)
  peakValue?: number; // Peak portfolio value seen so far (for percentage calculations)
  previousPortfolioValue?: number; // Previous portfolio value (for "reaches" operator)
}
