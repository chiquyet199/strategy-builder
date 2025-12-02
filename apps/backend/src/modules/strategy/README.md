# Strategy Module

## Overview
The Strategy module provides investment strategy implementations and calculation logic. It manages strategy instances and provides a unified interface for calculating strategy results.

## Key Services

### StrategyService
Main service for managing strategies:
- **getStrategy()**: Get a strategy instance by ID
- **getAllStrategies()**: Get all registered strategy instances
- **getStrategyMetadata()**: Get metadata (ID and name) for all strategies
- **calculateStrategy()**: Calculate strategy results with given parameters

## Available Strategies

1. **Lump Sum** (`lump-sum`)
   - Invests entire amount at the start
   - No parameters

2. **DCA** (`dca`)
   - Dollar Cost Averaging - invests fixed amount at regular intervals
   - Parameters: `frequency` (daily, weekly, monthly)

3. **RSI DCA** (`rsi-dca`)
   - DCA with RSI-based buy signals
   - Parameters: `rsiPeriod`, `oversoldThreshold`, `overboughtThreshold`, `buyMultiplier`

4. **Dip Buyer DCA** (`dip-buyer-dca`)
   - DCA that increases investment during price drops
   - Parameters: `lookbackDays`, `dropThreshold`, `buyMultiplier`

5. **Moving Average DCA** (`moving-average-dca`)
   - DCA based on moving average signals
   - Parameters: `maPeriod`, `buyMultiplier`

6. **Combined Smart DCA** (`combined-smart-dca`)
   - Combines RSI, MA, and dip-buying strategies
   - Parameters: `rsiPeriod`, `oversoldThreshold`, `maPeriod`, `lookbackDays`, `dropThreshold`, `maxMultiplier`

7. **Rebalancing** (`rebalancing`)
   - Maintains target asset allocation through periodic rebalancing
   - Parameters: `targetAllocation`, `rebalanceThreshold`, `rebalanceSchedule`

## Strategy Interface

All strategies implement the `IStrategy` interface:

```typescript
interface IStrategy {
  getStrategyId(): string;
  getStrategyName(): string;
  calculate(candles, investmentAmount, startDate, endDate, parameters?): StrategyResult;
  getDefaultParameters(): Record<string, any>;
  validateParameters(parameters?): void;
}
```

## Strategy Result

Each strategy calculation returns:
- **transactions**: Array of buy/sell/funding transactions
- **metrics**: Performance metrics (total return, max drawdown, Sharpe ratio, etc.)
- **portfolioValueHistory**: Historical portfolio values over time

## Utilities

### MetricsCalculator
Pure functions for calculating performance metrics:
- Total return percentage
- Average buy price
- Maximum drawdown
- Sharpe ratio

### RsiCalculator
Pure functions for calculating RSI (Relative Strength Index):
- `calculate()`: Calculate RSI for a series of candles
- `getRsiAt()`: Get RSI value at a specific index

### MaCalculator
Pure functions for calculating Moving Averages:
- `calculate()`: Calculate SMA for a series of candles
- `getMaAt()`: Get MA value at a specific index

## Testing
Unit tests:
- `strategy.service.spec.ts`
- `metrics-calculator.spec.ts`
- `rsi-calculator.spec.ts`
- `ma-calculator.spec.ts`

