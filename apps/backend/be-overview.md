# Backend Functionalities Overview

## Core Modules

### 1. Backtest Module (`/api/v1/backtest`)
**Purpose**: Compare investment strategies against historical market data

**Endpoints**:
- `POST /compare` - Compare multiple strategies (public)
- `POST /share` - Create shareable comparison link (public)
- `GET /share/:shortCode` - Get shared comparison configuration (public)

**Features**:
- Supports multiple strategies in a single comparison
- Handles initial portfolio (BTC + USDC) and periodic funding schedules
- Returns transaction history, metrics (returns, drawdown, Sharpe ratio), and portfolio value history
- Share functionality with short codes

### 2. Strategy Module
**Purpose**: Investment strategy calculations

**Available Strategies**:
- **Lump Sum** - One-time investment
- **DCA** - Dollar-cost averaging with configurable frequency (daily/weekly/monthly) and spending (percentage/fixed amount)
- **RSI DCA** - DCA with RSI-based buy multipliers
- **Dip Buyer DCA** - Buys on price dips (percentage of available cash)
- **Moving Average DCA** - DCA with MA-based buy multipliers
- **Combined Smart DCA** - Combines RSI, MA, and dip detection
- **Rebalancing** - Maintains target BTC allocation with rebalancing

**Features**:
- Each strategy supports custom parameters
- Calculates metrics: total return, average buy price, max drawdown, Sharpe ratio
- Handles initial portfolios and funding schedules
- Transaction tracking with reasons

### 3. Market Data Module (`/api/v1/market-data`)
**Purpose**: Fetch and sync cryptocurrency market data from Binance

**Public Endpoints**:
- `GET /candles` - Get candlestick data (symbol, timeframe, date range)

**Admin Endpoints**:
- `GET /admin/sync-status` - Check sync status
- `POST /admin/sync/daily` - Trigger daily sync
- `POST /admin/sync/range` - Sync specific date range
- `POST /admin/sync/pre-populate` - Pre-populate historical data
- `POST /admin/sync/fill-gaps` - Fill data gaps
- `POST /admin/sync/force-resync` - Force re-sync

**Features**:
- Supports multiple timeframes (1h, 4h, 1d, 1w, 1m)
- Automatic rate limiting and retry logic
- Gap detection and filling
- Database caching for performance

### 4. Auth Module (`/api/v1/auth`)
**Purpose**: User authentication and authorization

**Endpoints**:
- `POST /register` - User registration (public)
- `POST /login` - User login (public)
- `POST /forgot-password` - Request password reset (public)
- `POST /reset-password` - Reset password (public)
- `GET /profile` - Get user profile (authenticated)
- `PUT /profile` - Update profile (authenticated)

**User Management** (Admin only):
- `GET /admin/users` - List users
- `PUT /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user
- `PUT /admin/users/:id/role` - Change user role

**Features**:
- JWT-based authentication
- Role-based access control (USER, ADMIN, MASTER)
- Password reset via email
- Rate limiting protection

### 5. Admin Module (`/api/v1/admin`)
**Purpose**: Administrative functions

**Endpoints**:
- `GET /comparison-runs` - List comparison runs (tracking)
- `GET /analytics/shared-comparisons` - Analytics for shared comparisons
- `POST /jobs/data-cleanup` - Trigger data cleanup job

**Features**:
- Comparison tracking and analytics
- Shared comparison analytics
- Scheduled data cleanup jobs

### 6. Email Module
**Purpose**: Email notifications

**Features**:
- Password reset emails
- Console provider for development
- Extensible provider interface

## Technical Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT
- **API Documentation**: Swagger/OpenAPI at `/api/docs`
- **Logging**: Winston
- **Validation**: class-validator, class-transformer

## Key Features

- **Strategy Comparison**: Compare multiple investment strategies side-by-side
- **Historical Backtesting**: Test strategies against real market data
- **Shareable Links**: Generate short URLs for strategy comparisons
- **Flexible Portfolios**: Support for initial BTC holdings + USDC
- **Periodic Funding**: Configurable funding schedules (daily/weekly/monthly)
- **Comprehensive Metrics**: Returns, drawdown, Sharpe ratio, transaction history
- **Role-Based Access**: USER, ADMIN, MASTER roles with appropriate permissions
- **Market Data Sync**: Automated syncing from Binance API with gap detection

