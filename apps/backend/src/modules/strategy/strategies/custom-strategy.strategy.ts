import { BaseStrategy } from './base.strategy';
import {
  StrategyResult,
  Transaction,
  InitialPortfolio,
  FundingSchedule,
} from '../interfaces/strategy-result.interface';
import { Candlestick } from '../../market-data/interfaces/candlestick.interface';
import { MetricsCalculator } from '../utils/metrics-calculator';
import {
  CustomStrategyConfig,
  CustomRule,
  WhenCondition,
  ThenAction,
  EvaluationContext,
  ScheduleCondition,
  PriceChangeCondition,
  PriceLevelCondition,
  VolumeChangeCondition,
  IndicatorCondition,
  AndCondition,
  OrCondition,
} from '../interfaces/custom-strategy.interface';
import { RsiCalculator } from '../utils/rsi-calculator';
import { MaCalculator } from '../utils/ma-calculator';

/**
 * Custom Strategy
 * Executes user-defined rules with WHEN conditions and THEN actions
 */
export class CustomStrategy extends BaseStrategy {
  getStrategyId(): string {
    return 'custom-strategy';
  }

  getStrategyName(): string {
    return 'Custom Strategy';
  }

  getDefaultParameters(): Record<string, any> {
    return {
      rules: [],
    };
  }

  validateParameters(parameters?: Record<string, any>): void {
    if (!parameters) {
      throw new Error('Custom strategy requires rules parameter');
    }

    const config = parameters as CustomStrategyConfig;

    if (!config.rules || !Array.isArray(config.rules)) {
      throw new Error('Custom strategy must have a rules array');
    }

    if (config.rules.length === 0) {
      throw new Error('Custom strategy must have at least one rule');
    }

    // Validate each rule
    config.rules.forEach((rule, index) => {
      if (!rule.id) {
        throw new Error(`Rule at index ${index} must have an id`);
      }

      if (!rule.when) {
        throw new Error(`Rule ${rule.id} must have a when condition`);
      }

      if (!rule.then || !Array.isArray(rule.then) || rule.then.length === 0) {
        throw new Error(
          `Rule ${rule.id} must have at least one action in then`,
        );
      }

      // Validate conditions
      this.validateCondition(rule.when, `Rule ${rule.id}`);

      // Validate actions
      rule.then.forEach((action, actionIndex) => {
        this.validateAction(action, `Rule ${rule.id}, Action ${actionIndex}`);
      });
    });
  }

  private validateCondition(condition: WhenCondition, context: string): void {
    switch (condition.type) {
      case 'schedule':
        if (!['daily', 'weekly', 'monthly'].includes(condition.frequency)) {
          throw new Error(`${context}: Invalid schedule frequency`);
        }
        if (condition.frequency === 'weekly' && !condition.dayOfWeek) {
          throw new Error(`${context}: Weekly schedule requires dayOfWeek`);
        }
        if (condition.frequency === 'monthly' && !condition.dayOfMonth) {
          throw new Error(`${context}: Monthly schedule requires dayOfMonth`);
        }
        if (condition.dayOfMonth !== undefined) {
          if (condition.dayOfMonth < 1 || condition.dayOfMonth > 28) {
            throw new Error(`${context}: dayOfMonth must be between 1 and 28`);
          }
        }
        break;

      case 'price_change':
        if (!['drop', 'rise'].includes(condition.direction)) {
          throw new Error(`${context}: Invalid price change direction`);
        }
        if (condition.threshold < 0 || condition.threshold > 1) {
          throw new Error(
            `${context}: Price change threshold must be between 0 and 1`,
          );
        }
        if (
          !['24h_high', '7d_high', '30d_high', 'ath'].includes(
            condition.referencePoint,
          )
        ) {
          throw new Error(`${context}: Invalid reference point`);
        }
        break;

      case 'price_level':
        if (!['above', 'below', 'equals'].includes(condition.operator)) {
          throw new Error(`${context}: Invalid price level operator`);
        }
        if (condition.price <= 0) {
          throw new Error(`${context}: Price level must be greater than 0`);
        }
        break;

      case 'volume_change':
        if (!['above', 'below'].includes(condition.operator)) {
          throw new Error(`${context}: Invalid volume change operator`);
        }
        if (condition.threshold <= 0) {
          throw new Error(
            `${context}: Volume change threshold must be greater than 0`,
          );
        }
        if (condition.lookbackDays < 1 || condition.lookbackDays > 365) {
          throw new Error(
            `${context}: Lookback days must be between 1 and 365`,
          );
        }
        break;

      case 'and':
      case 'or':
        if (!condition.conditions || condition.conditions.length === 0) {
          throw new Error(
            `${context}: ${condition.type} condition must have at least one sub-condition`,
          );
        }
        condition.conditions.forEach((subCondition, index) => {
          this.validateCondition(
            subCondition,
            `${context}, ${condition.type}[${index}]`,
          );
        });
        break;

      case 'indicator':
        // Validate indicator type
        if (!['rsi', 'ma', 'macd', 'bollinger'].includes(condition.indicator)) {
          throw new Error(
            `${context}: Invalid indicator type: ${condition.indicator}`,
          );
        }

        // Validate operator
        if (
          ![
            'less_than',
            'greater_than',
            'equals',
            'crosses_above',
            'crosses_below',
          ].includes(condition.operator)
        ) {
          throw new Error(
            `${context}: Invalid indicator operator: ${condition.operator}`,
          );
        }

        // Validate params based on indicator type
        if (condition.indicator === 'rsi' || condition.indicator === 'ma') {
          if (
            !condition.params ||
            typeof condition.params.period !== 'number'
          ) {
            throw new Error(
              `${context}: ${condition.indicator.toUpperCase()} indicator requires 'period' parameter`,
            );
          }
          if (condition.params.period < 2 || condition.params.period > 500) {
            throw new Error(
              `${context}: ${condition.indicator.toUpperCase()} period must be between 2 and 500`,
            );
          }
        }

        // Validate value
        if (typeof condition.value !== 'number') {
          throw new Error(
            `${context}: Indicator condition value must be a number`,
          );
        }

        // Validate operator-value combinations
        if (condition.indicator === 'rsi') {
          if (condition.value < 0 || condition.value > 100) {
            throw new Error(`${context}: RSI value must be between 0 and 100`);
          }
        }

        // Note: MACD and Bollinger Bands are not yet fully implemented
        if (
          condition.indicator === 'macd' ||
          condition.indicator === 'bollinger'
        ) {
          throw new Error(
            `${context}: ${condition.indicator.toUpperCase()} indicator is not yet implemented (Phase 2)`,
          );
        }

        // Validate crosses operators only work with MA
        if (
          (condition.operator === 'crosses_above' ||
            condition.operator === 'crosses_below') &&
          condition.indicator !== 'ma'
        ) {
          throw new Error(
            `${context}: Cross operators (crosses_above/crosses_below) only work with MA indicator`,
          );
        }
        break;
    }
  }

  private validateAction(action: ThenAction, context: string): void {
    switch (action.type) {
      case 'buy_fixed':
        if (action.amount <= 0) {
          throw new Error(
            `${context}: Buy fixed amount must be greater than 0`,
          );
        }
        break;

      case 'buy_percentage':
        if (action.percentage < 0 || action.percentage > 1) {
          throw new Error(`${context}: Buy percentage must be between 0 and 1`);
        }
        break;

      case 'buy_scaled':
        if (action.baseAmount <= 0) {
          throw new Error(
            `${context}: Buy scaled base amount must be greater than 0`,
          );
        }
        if (action.scaleFactor <= 0) {
          throw new Error(
            `${context}: Buy scaled scale factor must be greater than 0`,
          );
        }
        if (
          action.maxAmount !== undefined &&
          action.maxAmount < action.baseAmount
        ) {
          throw new Error(
            `${context}: Buy scaled max amount must be >= base amount`,
          );
        }
        break;

      case 'rebalance':
        if (action.targetAllocation < 0 || action.targetAllocation > 1) {
          throw new Error(
            `${context}: Rebalance target allocation must be between 0 and 1`,
          );
        }
        if (
          action.threshold !== undefined &&
          (action.threshold < 0 || action.threshold > 1)
        ) {
          throw new Error(
            `${context}: Rebalance threshold must be between 0 and 1`,
          );
        }
        break;

      case 'sell_fixed':
        if (action.amount <= 0) {
          throw new Error(
            `${context}: Sell fixed amount must be greater than 0`,
          );
        }
        break;

      case 'sell_percentage':
        if (action.percentage < 0 || action.percentage > 1) {
          throw new Error(
            `${context}: Sell percentage must be between 0 and 1`,
          );
        }
        break;

      case 'limit_order':
        if (action.price <= 0) {
          throw new Error(
            `${context}: Limit order price must be greater than 0`,
          );
        }
        if (action.amount <= 0) {
          throw new Error(
            `${context}: Limit order amount must be greater than 0`,
          );
        }
        if (action.expiresInDays !== undefined && action.expiresInDays < 1) {
          throw new Error(
            `${context}: Limit order expires in days must be >= 1`,
          );
        }
        break;
    }
  }

  protected calculateInternal(
    candles: Candlestick[],
    investmentAmount: number,
    startDate: string,
    endDate: string,
    parameters: Record<string, any>,
  ): StrategyResult {
    if (candles.length === 0) {
      throw new Error('No candles provided for calculation');
    }

    const config = parameters as CustomStrategyConfig;
    const initialPortfolio: InitialPortfolio | undefined =
      parameters._initialPortfolio;
    const fundingSchedule: FundingSchedule | undefined =
      parameters._fundingSchedule;
    const allowNegativeUsdc = parameters.allowNegativeUsdc ?? false;

    const firstCandlePrice = candles[0].close;

    // Get initial state from portfolio or use investmentAmount
    let initialAssetQuantity = 0;
    let initialUsdc = investmentAmount;
    let totalInitialValue = investmentAmount;

    if (initialPortfolio) {
      const initialState = this.getInitialState(
        initialPortfolio,
        firstCandlePrice,
        'BTC',
      );
      initialAssetQuantity = initialState.initialAssetQuantity;
      initialUsdc = initialState.initialUsdc;
      totalInitialValue = initialState.totalInitialValue;
    }

    const transactions: Transaction[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let currentQuantityHeld = initialAssetQuantity;
    let currentUsdcBalance = initialUsdc;
    let totalFunding = 0;

    // Track last funding date
    let lastFundingDate = new Date(start);
    lastFundingDate.setDate(lastFundingDate.getDate() - 1);

    // Sort rules by priority (lower number = higher priority)
    const sortedRules = [...config.rules]
      .filter((rule) => rule.enabled !== false)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    // Process each candle
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const candleDate = new Date(candle.timestamp);

      // Handle periodic funding (separate from rule execution)
      if (fundingSchedule && fundingSchedule.amount > 0) {
        const fundingPeriodDays =
          fundingSchedule.frequency === 'daily'
            ? 1
            : fundingSchedule.frequency === 'weekly'
              ? 7
              : 30; // monthly

        const daysSinceLastFunding = Math.floor(
          (candleDate.getTime() - lastFundingDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysSinceLastFunding >= fundingPeriodDays) {
          currentUsdcBalance += fundingSchedule.amount;
          totalFunding += fundingSchedule.amount;
          lastFundingDate = new Date(candleDate);

          // Create funding transaction
          const coinValue = currentQuantityHeld * candle.close;
          const usdcValue = currentUsdcBalance;
          const totalValue = coinValue + usdcValue;

          transactions.push({
            date: candle.timestamp,
            type: 'funding',
            price: candle.close,
            amount: fundingSchedule.amount,
            quantityPurchased: 0,
            reason: `Periodic funding: ${fundingSchedule.frequency} +$${fundingSchedule.amount}`,
            portfolioValue: {
              coinValue,
              usdcValue,
              totalValue,
              quantityHeld: currentQuantityHeld,
            },
          } as Transaction);
        }
      }

      // Evaluate each rule (multiple rules can trigger on the same day)
      for (const rule of sortedRules) {
        const context: EvaluationContext = {
          date: candle.timestamp,
          price: candle.close,
          portfolio: {
            btcQuantity: currentQuantityHeld,
            usdcAmount: currentUsdcBalance,
          },
          marketData: candles.slice(0, i + 1).map((c) => ({
            timestamp: c.timestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          })),
        };

        // Evaluate WHEN conditions and get severity if applicable
        const evaluationResult = this.evaluateConditionWithSeverity(
          rule.when,
          context,
        );
        const shouldExecute = evaluationResult.shouldExecute;
        const conditionSeverity = evaluationResult.severity;

        if (shouldExecute) {
          // Execute THEN actions with condition severity context
          const actionContext = { ...context, conditionSeverity };
          for (const action of rule.then) {
            const result = this.executeAction(
              action,
              currentUsdcBalance,
              currentQuantityHeld,
              candle.close,
              allowNegativeUsdc,
              actionContext,
            );

            if (result.quantityChanged !== 0 || result.amountChanged !== 0) {
              currentQuantityHeld += result.quantityChanged;
              currentUsdcBalance += result.amountChanged; // Positive for sells, negative for buys

              const coinValue = currentQuantityHeld * candle.close;
              const totalValue = coinValue + currentUsdcBalance;

              // For sells, quantityPurchased should be negative or we use absolute value
              const quantityForTransaction = Math.abs(result.quantityChanged);

              transactions.push({
                date: candle.timestamp,
                type: result.transactionType,
                price: candle.close,
                amount: Math.abs(result.amountChanged),
                quantityPurchased:
                  result.transactionType === 'sell'
                    ? -quantityForTransaction
                    : quantityForTransaction,
                reason: result.reason,
                portfolioValue: {
                  coinValue,
                  usdcValue: currentUsdcBalance,
                  totalValue,
                  quantityHeld: currentQuantityHeld,
                },
              } as Transaction);
            }
          }
        }
      }
    }

    // Build portfolio history
    const portfolioHistory = MetricsCalculator.buildPortfolioHistory(
      transactions,
      candles,
      startDate,
      totalInitialValue + totalFunding,
      initialAssetQuantity,
      initialUsdc,
    );

    // Calculate total capital
    const totalCapital = totalInitialValue + totalFunding;

    // Calculate metrics
    const metrics = MetricsCalculator.calculate(
      transactions,
      portfolioHistory,
      totalCapital,
    );

    return {
      strategyId: this.getStrategyId(),
      strategyName: this.getStrategyName(),
      variantName: config.name,
      parameters,
      transactions,
      metrics,
      portfolioValueHistory: portfolioHistory,
    };
  }

  /**
   * Evaluate a WHEN condition with severity calculation
   */
  private evaluateConditionWithSeverity(
    condition: WhenCondition,
    context: EvaluationContext,
  ): { shouldExecute: boolean; severity?: number } {
    const shouldExecute = this.evaluateCondition(condition, context);
    let severity: number | undefined;

    // Calculate severity for scaled actions
    if (shouldExecute && condition.type === 'price_change') {
      const { price, marketData } = context;
      let referencePrice: number;

      switch (condition.referencePoint) {
        case '24h_high':
          referencePrice = this.findHighInPeriod(marketData, 1);
          break;
        case '7d_high':
          referencePrice = this.findHighInPeriod(marketData, 7);
          break;
        case '30d_high':
          referencePrice = this.findHighInPeriod(marketData, 30);
          break;
        case 'ath':
          referencePrice = this.findAllTimeHigh(marketData);
          break;
        default:
          referencePrice = price;
      }

      if (referencePrice > 0) {
        const change = Math.abs((price - referencePrice) / referencePrice);
        severity = Math.min(change / condition.threshold, 2.0); // Cap at 2x threshold
      }
    }

    // For indicator conditions, calculate severity
    if (condition.type === 'indicator') {
      return this.evaluateIndicatorWithSeverity(condition, context);
    }

    return { shouldExecute, severity: severity || 1.0 };
  }

  /**
   * Evaluate a WHEN condition
   */
  private evaluateCondition(
    condition: WhenCondition,
    context: EvaluationContext,
  ): boolean {
    switch (condition.type) {
      case 'schedule':
        return this.evaluateSchedule(condition, context);

      case 'price_change':
        return this.evaluatePriceChange(condition, context);

      case 'price_level':
        return this.evaluatePriceLevel(condition, context);

      case 'volume_change':
        return this.evaluateVolumeChange(condition, context);

      case 'and':
        return condition.conditions.every((c) =>
          this.evaluateCondition(c, context),
        );

      case 'or':
        return condition.conditions.some((c) =>
          this.evaluateCondition(c, context),
        );

      case 'indicator':
        return this.evaluateIndicator(condition, context);

      default:
        return false;
    }
  }

  /**
   * Evaluate schedule condition
   */
  private evaluateSchedule(
    condition: ScheduleCondition,
    context: EvaluationContext,
  ): boolean {
    const date = new Date(context.date);

    switch (condition.frequency) {
      case 'daily':
        return true; // Every day

      case 'weekly':
        if (!condition.dayOfWeek) return false;
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const targetDay = this.dayNameToNumber(condition.dayOfWeek);
        return dayOfWeek === targetDay;

      case 'monthly':
        if (!condition.dayOfMonth) return false;
        const dayOfMonth = date.getDate();
        return dayOfMonth === condition.dayOfMonth;

      default:
        return false;
    }
  }

  /**
   * Convert day name to number (0 = Sunday, 1 = Monday, etc.)
   */
  private dayNameToNumber(
    dayName:
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
      | 'sunday',
  ): number {
    const map: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return map[dayName.toLowerCase()] ?? 0;
  }

  /**
   * Evaluate price change condition
   */
  private evaluatePriceChange(
    condition: PriceChangeCondition,
    context: EvaluationContext,
  ): boolean {
    const { price, marketData } = context;

    // Find reference price based on referencePoint
    let referencePrice: number;

    switch (condition.referencePoint) {
      case '24h_high':
        referencePrice = this.findHighInPeriod(marketData, 1);
        break;

      case '7d_high':
        referencePrice = this.findHighInPeriod(marketData, 7);
        break;

      case '30d_high':
        referencePrice = this.findHighInPeriod(marketData, 30);
        break;

      case 'ath':
        referencePrice = this.findAllTimeHigh(marketData);
        break;

      default:
        return false;
    }

    if (!referencePrice || referencePrice === 0) {
      return false;
    }

    // Calculate percentage change
    const change = (price - referencePrice) / referencePrice;

    if (condition.direction === 'drop') {
      return change <= -condition.threshold;
    } else {
      return change >= condition.threshold;
    }
  }

  /**
   * Find highest price in the last N days
   */
  private findHighInPeriod(
    marketData: Array<{ high: number }>,
    days: number,
  ): number {
    if (marketData.length === 0) return 0;

    const lookback = Math.min(days, marketData.length);
    const recentData = marketData.slice(-lookback);
    return Math.max(...recentData.map((d) => d.high));
  }

  /**
   * Find all-time high
   */
  private findAllTimeHigh(marketData: Array<{ high: number }>): number {
    if (marketData.length === 0) return 0;
    return Math.max(...marketData.map((d) => d.high));
  }

  /**
   * Evaluate price level condition
   */
  private evaluatePriceLevel(
    condition: PriceLevelCondition,
    context: EvaluationContext,
  ): boolean {
    const { price } = context;

    switch (condition.operator) {
      case 'above':
        return price > condition.price;
      case 'below':
        return price < condition.price;
      case 'equals':
        // Allow small tolerance for floating point comparison
        return Math.abs(price - condition.price) < 0.01;
      default:
        return false;
    }
  }

  /**
   * Evaluate volume change condition
   */
  private evaluateVolumeChange(
    condition: VolumeChangeCondition,
    context: EvaluationContext,
  ): boolean {
    const { marketData } = context;
    if (marketData.length < condition.lookbackDays + 1) {
      return false; // Not enough data
    }

    // Get current volume (assuming volume is available in marketData)
    const currentCandle = marketData[marketData.length - 1];
    const currentVolume = (currentCandle as any).volume || 0;

    if (currentVolume === 0) return false;

    // Calculate average volume over lookback period
    const lookbackCandles = marketData.slice(-condition.lookbackDays - 1, -1);
    const averageVolume =
      lookbackCandles.reduce((sum, c) => sum + ((c as any).volume || 0), 0) /
      lookbackCandles.length;

    if (averageVolume === 0) return false;

    const volumeRatio = currentVolume / averageVolume;

    if (condition.operator === 'above') {
      return volumeRatio >= condition.threshold;
    } else {
      return volumeRatio <= 1 / condition.threshold; // For "below", check if current is below threshold of average
    }
  }

  /**
   * Evaluate indicator condition (returns boolean)
   */
  private evaluateIndicator(
    condition: IndicatorCondition,
    context: EvaluationContext,
  ): boolean {
    const result = this.evaluateIndicatorWithSeverity(condition, context);
    return result.shouldExecute;
  }

  /**
   * Evaluate indicator condition with severity calculation
   */
  private evaluateIndicatorWithSeverity(
    condition: IndicatorCondition,
    context: EvaluationContext,
  ): { shouldExecute: boolean; severity: number } {
    const { marketData } = context;
    if (marketData.length === 0) return { shouldExecute: false, severity: 1.0 };

    // Convert marketData to Candlestick format for calculators
    const candles = marketData.map((c) => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: (c as any).volume || 0,
      timeframe: '1d' as const,
    }));

    try {
      let indicatorValue: number;
      let maValues: number[] = [];

      switch (condition.indicator) {
        case 'rsi':
          const rsiPeriod = condition.params?.period || 14;
          const rsiValues = RsiCalculator.calculate(candles, rsiPeriod);
          indicatorValue = rsiValues[rsiValues.length - 1];
          if (isNaN(indicatorValue))
            return { shouldExecute: false, severity: 1.0 };
          break;

        case 'ma':
          const maPeriod = condition.params?.period || 50;
          maValues = MaCalculator.calculate(candles, maPeriod);
          indicatorValue = maValues[maValues.length - 1];
          if (isNaN(indicatorValue))
            return { shouldExecute: false, severity: 1.0 };
          break;

        case 'macd':
        case 'bollinger':
          // Phase 2: Implement MACD and Bollinger Bands
          return { shouldExecute: false, severity: 1.0 };

        default:
          return { shouldExecute: false, severity: 1.0 };
      }

      let shouldExecute = false;
      let severity = 1.0;

      // Apply operator
      switch (condition.operator) {
        case 'less_than':
          shouldExecute = indicatorValue < condition.value;
          if (shouldExecute && condition.indicator === 'rsi') {
            // Severity: how far below threshold (0-1)
            severity = Math.min(
              1.0,
              (condition.value - indicatorValue) / condition.value,
            );
          }
          break;
        case 'greater_than':
          shouldExecute = indicatorValue > condition.value;
          if (shouldExecute && condition.indicator === 'rsi') {
            // Severity: how far above threshold (0-1)
            severity = Math.min(
              1.0,
              (indicatorValue - condition.value) / (100 - condition.value),
            );
          }
          break;
        case 'equals':
          shouldExecute = Math.abs(indicatorValue - condition.value) < 0.01;
          break;
        case 'crosses_above':
          // Check if price crosses above the MA
          if (condition.indicator !== 'ma') {
            shouldExecute = false;
            break;
          }
          if (marketData.length < 2 || maValues.length < 2) {
            shouldExecute = false;
            break;
          }
          const prevPrice = marketData[marketData.length - 2]?.close || 0;
          const currentPrice = context.price;
          const prevMa = maValues[maValues.length - 2];
          shouldExecute = prevPrice <= prevMa && currentPrice > indicatorValue;
          if (shouldExecute) {
            // Severity based on how much price is above MA
            severity = Math.min(
              1.0,
              (currentPrice - indicatorValue) / indicatorValue,
            );
          }
          break;
        case 'crosses_below':
          // Check if price crosses below the MA
          if (condition.indicator !== 'ma') {
            shouldExecute = false;
            break;
          }
          if (marketData.length < 2 || maValues.length < 2) {
            shouldExecute = false;
            break;
          }
          const prevPrice2 = marketData[marketData.length - 2]?.close || 0;
          const currentPrice2 = context.price;
          const prevMa2 = maValues[maValues.length - 2];
          shouldExecute =
            prevPrice2 >= prevMa2 && currentPrice2 < indicatorValue;
          if (shouldExecute) {
            // Severity based on how much price is below MA
            severity = Math.min(
              1.0,
              (indicatorValue - currentPrice2) / indicatorValue,
            );
          }
          break;
        default:
          shouldExecute = false;
      }

      return { shouldExecute, severity };
    } catch (error) {
      return { shouldExecute: false, severity: 1.0 };
    }
  }

  /**
   * Execute a THEN action
   * Returns quantity changed (positive for buys, negative for sells) and amount changed (negative for buys, positive for sells)
   */
  private executeAction(
    action: ThenAction,
    availableCash: number,
    currentQuantityHeld: number,
    currentPrice: number,
    allowNegativeUsdc: boolean,
    context?: EvaluationContext,
  ): {
    quantityChanged: number;
    amountChanged: number;
    transactionType: 'buy' | 'sell';
    reason: string;
  } {
    switch (action.type) {
      case 'buy_fixed':
        const fixedAmount = this.calculatePurchaseAmount(
          action.amount,
          availableCash,
          allowNegativeUsdc,
        );
        const quantityPurchased = fixedAmount / currentPrice;
        return {
          quantityChanged: quantityPurchased,
          amountChanged: -fixedAmount, // Negative because we're spending cash
          transactionType: 'buy',
          reason: `Custom rule: Buy $${action.amount.toFixed(2)}`,
        };

      case 'buy_percentage':
        const percentageAmount = availableCash * action.percentage;
        const actualAmount = this.calculatePurchaseAmount(
          percentageAmount,
          availableCash,
          allowNegativeUsdc,
        );
        const quantityPurchasedPercent = actualAmount / currentPrice;
        return {
          quantityChanged: quantityPurchasedPercent,
          amountChanged: -actualAmount, // Negative because we're spending cash
          transactionType: 'buy',
          reason: `Custom rule: Buy ${(action.percentage * 100).toFixed(0)}% of available cash ($${actualAmount.toFixed(2)})`,
        };

      case 'buy_scaled':
        // Calculate scale based on condition severity
        const severity = context?.conditionSeverity || 1.0; // Default to 1.0 if no severity
        const scaledAmount = action.baseAmount * action.scaleFactor * severity;
        const finalScaledAmount = action.maxAmount
          ? Math.min(scaledAmount, action.maxAmount)
          : scaledAmount;
        const actualScaledAmount = this.calculatePurchaseAmount(
          finalScaledAmount,
          availableCash,
          allowNegativeUsdc,
        );
        const quantityPurchasedScaled = actualScaledAmount / currentPrice;
        return {
          quantityChanged: quantityPurchasedScaled,
          amountChanged: -actualScaledAmount, // Negative because we're spending cash
          transactionType: 'buy',
          reason: `Custom rule: Buy scaled $${actualScaledAmount.toFixed(2)} (base: $${action.baseAmount}, scale: ${(action.scaleFactor * severity).toFixed(2)}x)`,
        };

      case 'sell_fixed':
        // Sell $X worth of BTC
        const sellQuantity = action.amount / currentPrice;
        const actualSellQuantity = Math.min(sellQuantity, currentQuantityHeld);
        const sellAmount = actualSellQuantity * currentPrice;
        return {
          quantityChanged: -actualSellQuantity, // Negative because we're selling
          amountChanged: sellAmount, // Positive because we're receiving cash
          transactionType: 'sell',
          reason: `Custom rule: Sell $${action.amount.toFixed(2)} worth of BTC`,
        };

      case 'sell_percentage':
        // Sell X% of BTC holdings
        const sellQuantityPercent = currentQuantityHeld * action.percentage;
        const sellAmountPercent = sellQuantityPercent * currentPrice;
        return {
          quantityChanged: -sellQuantityPercent, // Negative because we're selling
          amountChanged: sellAmountPercent, // Positive because we're receiving cash
          transactionType: 'sell',
          reason: `Custom rule: Sell ${(action.percentage * 100).toFixed(0)}% of BTC holdings ($${sellAmountPercent.toFixed(2)})`,
        };

      case 'rebalance':
        // Rebalancing is handled differently - it's not a simple buy/sell action
        // This would need portfolio context to calculate rebalancing amounts
        // For now, return 0 and handle rebalancing separately if needed
        return {
          quantityChanged: 0,
          amountChanged: 0,
          transactionType: 'buy',
          reason: 'Rebalancing action - not yet fully implemented',
        };

      case 'limit_order':
        // Limit orders are placed but not executed immediately
        // They would need to be tracked and executed when price is reached
        // For now, check if current price matches limit price
        const priceDiff = Math.abs(currentPrice - action.price) / action.price;
        if (priceDiff < 0.001) {
          // Price matches (within 0.1% tolerance)
          const limitAmount = this.calculatePurchaseAmount(
            action.amount,
            availableCash,
            allowNegativeUsdc,
          );
          const limitQuantity = limitAmount / currentPrice;
          return {
            quantityChanged: limitQuantity,
            amountChanged: -limitAmount, // Negative because we're spending cash
            transactionType: 'buy',
            reason: `Custom rule: Limit order executed at $${action.price.toFixed(2)}`,
          };
        }
        return {
          quantityChanged: 0,
          amountChanged: 0,
          transactionType: 'buy',
          reason: `Custom rule: Limit order pending at $${action.price.toFixed(2)} (current: $${currentPrice.toFixed(2)})`,
        };

      default:
        return {
          quantityChanged: 0,
          amountChanged: 0,
          transactionType: 'buy',
          reason: 'Unknown action type',
        };
    }
  }
}
