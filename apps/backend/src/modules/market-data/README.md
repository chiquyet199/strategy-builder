# Market Data Module

## Overview
The Market Data module handles fetching, storing, and syncing cryptocurrency market data from Binance API. It provides both public endpoints for retrieving candlestick data and admin endpoints for managing data synchronization.

## Key Services

### MarketDataService
Main service for retrieving market data:
- **getCandles()**: Retrieves candlestick data from database for a symbol, timeframe, and date range
- Validates symbols and date ranges
- Queries directly from database (data must be synced via admin endpoints)

### MarketDataSyncService
Service for syncing market data from Binance API:
- **prePopulateHistoricalData()**: Pre-populates historical data for all supported symbols and timeframes
- **syncDailyData()**: Syncs today's data for all timeframes
- **syncDateRange()**: Syncs data for a specific date range and timeframe
- **checkAndFillGaps()**: Detects and fills gaps in historical data
- **forceResyncDateRange()**: Force re-syncs data (overwrites existing)
- **getSyncStatus()**: Returns sync status with record counts per timeframe

### BinanceApiService
Service for interacting with Binance API:
- **getKlines()**: Fetches candlestick data from Binance with automatic pagination
- **checkApiHealth()**: Checks if Binance API is available
- **getServerTime()**: Gets Binance server time
- Implements rate limiting and exponential backoff for retries

## API Endpoints

### Public Endpoints

#### GET `/api/v1/market-data/candles`
Get candlestick data for a symbol and timeframe.

**Query Parameters:**
- `symbol` (optional): Trading pair (default: BTC/USD)
- `timeframe` (optional): Timeframe - 1h, 4h, 1d, 1w, 1m (default: 1d)
- `startDate` (required): Start date in ISO 8601 format
- `endDate` (required): End date in ISO 8601 format

### Admin Endpoints (Requires ADMIN or MASTER role)

#### GET `/api/v1/market-data/admin/sync-status`
Get sync status for a symbol.

#### POST `/api/v1/market-data/admin/sync/daily`
Manually trigger daily sync.

#### POST `/api/v1/market-data/admin/sync/prepopulate`
Manually trigger historical data pre-population.

#### POST `/api/v1/market-data/admin/sync/date-range`
Sync data for a specific date range.

#### POST `/api/v1/market-data/admin/sync/fill-gaps`
Check and fill gaps in market data.

#### POST `/api/v1/market-data/admin/sync/force-resync`
Force re-sync data (overwrites existing).

## Configuration

### Environment Variables
- `SUPPORTED_SYMBOLS`: Comma-separated list of supported trading pairs (default: "BTC/USD")
- `MARKET_DATA_PREPOPULATE`: Enable/disable automatic pre-population on startup (default: true)
- `MARKET_DATA_BATCH_SIZE`: Batch size for database operations (default: 1000)

## Data Storage
- **Entity**: `Candlestick` (stored in `candlesticks` table)
- **Indexes**: 
  - Unique index on (symbol, timeframe, timestamp)
  - Index on timestamp
  - Index on (symbol, timeframe)

## Supported Timeframes
- `1h`: 1 hour
- `4h`: 4 hours
- `1d`: 1 day
- `1w`: 1 week
- `1m`: 1 month

## Testing
Unit tests:
- `market-data.service.spec.ts`
- `binance-api.service.spec.ts`
- `market-data-sync.service.spec.ts`

Controller tests: `market-data.controller.spec.ts`

