# Backtest Module

## Overview
The Backtest module provides functionality to compare multiple investment strategies against historical market data. It orchestrates strategy calculations and aggregates results for comparison.

## Key Services

### BacktestService
Main service for comparing strategies:
- **compareStrategies()**: Compares multiple strategies with the same market data and investment configuration
- Normalizes input DTOs (supports both legacy `investmentAmount` and new `initialPortfolio` formats)
- Handles initial portfolio setup and periodic funding schedules
- Aggregates results from multiple strategy calculations

## API Endpoints

### POST `/api/v1/backtest/compare`
Compare multiple investment strategies.

**Request Body:**
```json
{
  "strategies": [
    { "strategyId": "lump-sum", "parameters": {} },
    { "strategyId": "dca", "parameters": { "frequency": "weekly" } }
  ],
  "startDate": "2020-01-01",
  "endDate": "2025-11-28",
  "investmentAmount": 10000,
  "timeframe": "1d"
}
```

**Response:**
```json
{
  "results": [
    {
      "strategyId": "lump-sum",
      "strategyName": "Lump Sum",
      "transactions": [...],
      "metrics": {
        "totalReturn": 150.5,
        "avgBuyPrice": 7200.5,
        "maxDrawdown": 25.3,
        "finalValue": 25050,
        "sharpeRatio": 1.2,
        "totalInvestment": 10000,
        "totalQuantity": 1.3889
      }
    }
  ],
  "metadata": {
    "investmentAmount": 10000,
    "startDate": "2020-01-01",
    "endDate": "2025-11-28",
    "timeframe": "1d",
    "calculatedAt": "2025-01-01T12:00:00.000Z"
  }
}
```

## Dependencies
- **MarketDataService**: Fetches historical candlestick data
- **StrategyService**: Provides strategy instances and calculation methods

## Testing
Unit tests: `backtest.service.spec.ts`
Controller tests: `backtest.controller.spec.ts`

