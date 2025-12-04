# WhatIfCrypto Custom Strategy Builder - Product Requirements Document
## Version 2.0 - Backend-Integrated Architecture

---

> **📋 Framework-Agnostic Specification**  
> This PRD is intentionally framework-agnostic. All frontend code examples are **pseudocode** showing conceptual structure.  
> **Implementation**: Use your project's framework (Vue.js) and follow conventions defined in `.cursorrules`.  
> The specification focuses on **what to build**, not **how to build it** in a specific framework.

---

## Executive Summary

Build a visual, no-code **Custom Strategy Builder** that allows users to create sophisticated DCA investment strategies through an intuitive block-based interface. The builder integrates with existing backend infrastructure and introduces a new `custom-strategy` engine that serves as the backbone for both new custom strategies and refactored existing strategies.

**Key Innovation:** All strategies (existing + custom) will be powered by the same rule engine, with existing strategies becoming "pre-built templates" of the custom builder.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Integration with Existing System](#2-integration-with-existing-system)
3. [Architecture & Technical Design](#3-architecture--technical-design)
4. [Custom Strategy Builder UI](#4-custom-strategy-builder-ui)
5. [Backend Extensions](#5-backend-extensions)
6. [Data Models & API Contracts](#6-data-models--api-contracts)
7. [User Flows](#7-user-flows)
8. [Implementation Phases](#8-implementation-phases)
9. [Acceptance Criteria](#9-acceptance-criteria)

---

## 1. Product Overview

### 1.1 Vision

Create a strategy builder where:
- Beginners can click "Add DCA" and get proven templates
- Intermediate users can tweak parameters
- Advanced users can build completely custom strategies
- All strategies share the same powerful rule engine

### 1.2 Core Principles

- **"See it in 3 clicks, understand it in 3 seconds"** - Visual clarity over complexity
- **Pre-built templates are custom strategies** - No separate code paths
- **Progressive disclosure** - Simple by default, power when needed
- **Backend does heavy lifting** - Client builds UI, server executes logic

### 1.3 Current State (What Exists)

✅ **Playground Page** - Strategy comparison interface  
✅ **7 Pre-built Strategies** - DCA, RSI DCA, Dip Buyer, MA DCA, Combined Smart, Rebalancing, Lump Sum  
✅ **Backtest API** - `POST /api/v1/backtest/compare`  
✅ **Market Data API** - `GET /api/v1/market-data/candles`  
✅ **Share Functionality** - Short code generation  
✅ **Results Visualization** - Chart + metrics table  

### 1.4 What We're Building

🆕 **Custom Strategy Builder Page** - Visual rule editor  
🆕 **Backend Rule Engine** - `custom-strategy` type  
🔄 **Refactor Existing Strategies** - Convert to pre-built custom strategies  
🔄 **Enhanced API** - Accept custom rule definitions  

---

## 2. Integration with Existing System

### 2.1 Current Playground Flow

```
User on Playground Page
  ↓
Selects strategies: [Add DCA] [Add RSI DCA] [Add Custom]
  ↓
Configures: Funding ($100/week), Date Range (2020-2025)
  ↓
Clicks "Compare Strategies"
  ↓
POST /api/v1/backtest/compare
  ↓
Results displayed: Chart + Metrics Table
```

### 2.2 New Custom Strategy Flow

```
User clicks [Add Custom] on Playground
  ↓
Navigate to Strategy Builder Page
  ↓
User builds strategy using WHEN/THEN blocks
  ↓
Clicks "Save & Add to Comparison"
  ↓
Navigate back to Playground
  ↓
Custom strategy appears in selected strategies list
  ↓
User clicks "Compare Strategies"
  ↓
POST /api/v1/backtest/compare (includes custom strategy)
  ↓
Results displayed alongside other strategies
```

### 2.3 API Integration Points

#### Existing APIs (Use As-Is)

**Market Data:**
```
GET /api/v1/market-data/candles
  ?symbol=BTC/USD
  &timeframe=1d
  &startDate=2020-01-01
  &endDate=2025-12-31

Response: Array of OHLCV candles
```

**Backtest Comparison:**
```
POST /api/v1/backtest/compare
{
  "strategies": [
    { "strategyId": "dca", "parameters": {...}, "variantName": "Weekly DCA" },
    { "strategyId": "custom-strategy", "parameters": {...}, "variantName": "My Strategy" }
  ],
  "startDate": "2020-01-01",
  "endDate": "2025-11-28",
  "initialPortfolio": { "assets": [...], "usdcAmount": 5000 },
  "fundingSchedule": { "frequency": "weekly", "amount": 100 },
  "timeframe": "1d"
}

Response: {
  "results": [
    {
      "strategyId": "...",
      "strategyName": "...",
      "variantName": "...",
      "metrics": {...},
      "transactions": [...],
      "portfolioValueHistory": [...]
    }
  ],
  "metadata": {...}
}
```

**Share Functionality:**
```
POST /api/v1/backtest/share
Body: { strategies: [...], startDate, endDate, ... }
Response: { shortCode: "abc123", url: "..." }

GET /api/v1/backtest/share/:shortCode
Response: { strategies: [...], startDate, endDate, ... }
```

#### New APIs (To Build)

**Custom Strategy Validation:**
```
POST /api/v1/strategies/validate
Body: { rules: [...] }
Response: { valid: boolean, errors: [...], warnings: [...] }
```

---

## 3. Architecture & Technical Design

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Frontend framework + TypeScript)            │
│                                                             │
│  ┌──────────────────────┐    ┌──────────────────────────┐ │
│  │  Playground Page     │    │  Strategy Builder Page    │ │
│  │  (Existing)          │◄───┤  (New)                    │ │
│  │                      │    │                            │ │
│  │  • Strategy select   │    │  • WHEN/THEN blocks       │ │
│  │  • Funding config    │    │  • Indicator preview      │ │
│  │  • Results chart     │    │  • Validation             │ │
│  └──────────────────────┘    └──────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Indicator Engine (Client-side)               │  │
│  │  • Calculate RSI, MA, MACD, Bollinger, etc.          │  │
│  │  • Preview: "This triggered 47 times in 2020-2025"   │  │
│  │  • Fetch candles from /api/v1/market-data            │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ REST API
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Backend (NestJS + PostgreSQL)                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Custom Strategy Engine (New)                  │  │
│  │                                                        │  │
│  │  class CustomStrategyService {                        │  │
│  │    execute(rules[], marketData, portfolio) {          │  │
│  │      for each day:                                    │  │
│  │        for each rule:                                 │  │
│  │          if rule.when.evaluate(context):              │  │
│  │            rule.then.execute(portfolio)               │  │
│  │    }                                                   │  │
│  │  }                                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Refactored Existing Strategies                     │  │
│  │    (Pre-built Custom Strategies)                      │  │
│  │                                                        │  │
│  │  class DCAStrategy {                                  │  │
│  │    toCustomRules() {                                  │  │
│  │      return [{                                        │  │
│  │        when: { type: 'schedule', frequency: 'weekly' },│  │
│  │        then: { type: 'buy', amount: 100 }             │  │
│  │      }]                                                │  │
│  │    }                                                   │  │
│  │  }                                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ✅ Existing: Backtest Module, Market Data, Auth          │  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

**Building a Custom Strategy:**
```
1. User on Strategy Builder Page
2. Adds WHEN block: "Every Monday"
3. Frontend calculates preview: "Would trigger 260 times in 5 years"
4. Adds THEN block: "Buy $100"
5. Clicks "Save & Add to Comparison"
6. Frontend creates strategy definition:
   {
     strategyId: "custom-strategy",
     variantName: "My Weekly DCA",
     parameters: {
       rules: [
         {
           id: "rule_1",
           when: {
             type: "schedule",
             frequency: "weekly",
             dayOfWeek: "monday"
           },
           then: {
             type: "buy_fixed",
             amount: 100
           }
         }
       ]
     }
   }
7. Navigate back to Playground
8. Strategy appears in selected list
9. User clicks "Compare Strategies"
10. POST /api/v1/backtest/compare with custom strategy included
11. Backend executes custom strategy using rule engine
12. Returns results in same format as existing strategies
```

**Running Backtest:**
```
Backend receives custom strategy
  ↓
CustomStrategyService.execute(rules, marketData, portfolio)
  ↓
For each day in date range:
  • Update current price, portfolio value
  • Evaluate each rule's WHEN conditions
  • If condition true, execute THEN actions
  • Record transactions
  • Update portfolio state
  ↓
Calculate metrics (return, drawdown, Sharpe, etc.)
  ↓
Return in standard format
```

### 3.3 Technology Stack

**Frontend:**
- Modern JavaScript framework with TypeScript
- State Management: Use your existing state management solution
- UI Components: Use your existing component library
- Charts: Existing chart library (keep as-is)
- Indicator Calculations: technicalindicators npm package
- Form Validation: Zod or your preferred validation library

**Backend (Extensions):**
- NestJS (existing framework)
- TypeORM (existing ORM)
- New: CustomStrategyService
- Refactor: Existing strategy classes

**Client-Side Calculations:**
- RSI, MACD, Bollinger Bands, Moving Averages, etc.
- Using `technicalindicators` library
- Fetch candles from existing `/api/v1/market-data/candles`

**Note:** All frontend code examples in this document are pseudocode. Implement using your project's framework conventions as defined in `.cursorrules`.

---

## 4. Custom Strategy Builder UI

### 4.1 Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Strategy Builder                      [Cancel] [Save & Add] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Strategy Name: [My Custom Strategy____________]            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Rule #1                                      [Delete]  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ WHEN (Conditions)                                │  │ │
│  │  │   [Every Monday at 9:00 AM]              [Edit]  │  │ │
│  │  │   AND                                             │  │ │
│  │  │   [RSI(14) < 30]                         [Edit]  │  │ │
│  │  │   [+ Add Condition]                              │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ THEN (Actions)                                   │  │ │
│  │  │   [Buy $100 of BTC]                      [Edit]  │  │ │
│  │  │   [+ Add Action]                                 │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [+ Add Rule]                                                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Preview Stats                                         │ │
│  │  📊 This strategy would trigger:                       │ │
│  │     • 47 times from 2020-2025                         │ │
│  │     • Average 9 times per year                        │ │
│  │  💰 Estimated investment:                             │ │
│  │     • $4,700 over 5 years                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Component Specifications

#### 4.2.1 Rule Block Component

**Component Structure (Framework-Agnostic Pseudocode):**

```typescript
// Note: Implement using your framework's component syntax
// This is conceptual structure, not actual code

interface RuleBlockProps {
  rule: CustomRule;
  ruleNumber: number;
  onUpdate: (rule: CustomRule) => void;
  onDelete: () => void;
}

Component RuleBlock(props) {
  return (
    <Card>
      <CardHeader>
        <h3>Rule #{props.ruleNumber}</h3>
        <Button onClick={props.onDelete}>Delete</Button>
      </CardHeader>
      
      <WhenSection
        conditions={props.rule.when}
        onChange={(when) => props.onUpdate({ ...props.rule, when })}
      />
      
      <ThenSection
        actions={rule.then}
        onChange={(then) => onUpdate({ ...rule, then })}
      />
    </Card>
  );
};
```

#### 4.2.2 WHEN Section (Conditions)

**Condition Types to Support (Phase 1):**

1. **Time-Based (Schedule)**
   ```
   UI: [Every ▼] [Monday ▼] [at 9:00 AM]
   
   Output:
   {
     type: "schedule",
     frequency: "weekly",
     dayOfWeek: "monday",
     time: "09:00"
   }
   ```

2. **Price-Based**
   ```
   UI: [Price drops ▼] [10%] [from ▼] [7-day high]
   
   Output:
   {
     type: "price_change",
     direction: "drop",
     threshold: 0.10,
     referencePoint: "7d_high"
   }
   ```

3. **Indicator-Based** (Phase 2 - Later)
   ```
   UI: [RSI(14) ▼] [< ▼] [30]
   
   Output:
   {
     type: "indicator",
     indicator: "rsi",
     params: { period: 14 },
     operator: "less_than",
     value: 30
   }
   ```

**Condition Builder Modal:**
```
┌─────────────────────────────────────────┐
│  Add Condition                   [×]    │
├─────────────────────────────────────────┤
│  Choose condition type:                 │
│                                         │
│  ⏰ Time-Based                          │
│     ○ Regular schedule (daily/weekly)   │
│     ○ Specific date                     │
│                                         │
│  📉 Price-Based                         │
│     ○ Price drops X%                    │
│     ○ Price reaches level               │
│                                         │
│  📊 Indicator-Based (Coming Soon)      │
│     ○ RSI < threshold                   │
│     ○ Price crosses MA                  │
│                                         │
│               [Cancel] [Add Condition]  │
└─────────────────────────────────────────┘
```

**Configuration Modal (Schedule Example):**
```
┌─────────────────────────────────────────┐
│  Configure Schedule             [×]     │
├─────────────────────────────────────────┤
│  Frequency:                             │
│  ○ Daily                                │
│  ● Weekly                               │
│  ○ Monthly                              │
│                                         │
│  Day of Week:                           │
│  [Monday        ▼]                      │
│                                         │
│  Time (optional):                       │
│  [09:00]                                │
│                                         │
│  📊 Preview:                            │
│  This will trigger approximately        │
│  260 times from 2020-2025              │
│                                         │
│               [Cancel] [Save]           │
└─────────────────────────────────────────┘
```

#### 4.2.3 THEN Section (Actions)

**Action Types (Phase 1):**

1. **Buy Fixed Amount**
   ```
   UI: [Buy $] [100] [of BTC]
   
   Output:
   {
     type: "buy_fixed",
     amount: 100
   }
   ```

2. **Buy Percentage of Available Cash**
   ```
   UI: [Buy] [50%] [of available cash]
   
   Output:
   {
     type: "buy_percentage",
     percentage: 0.5
   }
   ```

**Action Builder Modal:**
```
┌─────────────────────────────────────────┐
│  Add Action                      [×]    │
├─────────────────────────────────────────┤
│  Choose action type:                    │
│                                         │
│  💰 Buy Actions                         │
│     ● Buy fixed amount ($100)           │
│     ○ Buy percentage of cash (50%)      │
│                                         │
│  Amount:                                │
│  $ [100]                                │
│                                         │
│  ℹ️  This will purchase BTC using       │
│     available cash from your portfolio  │
│     or funding schedule.                │
│                                         │
│               [Cancel] [Add Action]     │
└─────────────────────────────────────────┘
```

#### 4.2.4 Logic Combinators (Phase 2)

For combining multiple conditions:
```
Rule #1
  WHEN
    [Condition 1]
    [AND ▼]  ← Toggle between AND/OR
    [Condition 2]
```

**Phase 1:** Only AND logic (all conditions must be true)  
**Phase 2:** Add OR and nested groups

#### 4.2.5 Preview Stats Panel

Real-time calculation as user builds (pseudocode):
```typescript
// Component: PreviewStats
// Props: { rules: CustomRule[] }

Component PreviewStats(props) {
  // Reactive state for stats
  stats = ref(null);
  
  // Watch for rule changes and debounce calculation
  watch(props.rules, debounce(async () => {
    // 1. Fetch historical candles
    const candles = await api.getCandles({
      symbol: 'BTC/USD',
      timeframe: '1d',
      startDate: '2020-01-01',
      endDate: '2025-12-31'
    });
    
    // 2. Evaluate rules against historical data
    const triggers = countTriggers(props.rules, candles);
    
    // 3. Estimate investment
    const estimatedInvestment = calculateEstimatedInvestment(props.rules, triggers);
    
    stats.value = { triggers, estimatedInvestment };
  }, 500));
  
  return (
    <Card>
      <h3>Preview Stats</h3>
      <p>📊 This strategy would trigger:</p>
      <p>• {stats?.triggers.total} times from 2020-2025</p>
      <p>• Average {stats?.triggers.perYear} times per year</p>
      <p>💰 Estimated investment:</p>
      <p>• ${stats?.estimatedInvestment} over 5 years</p>
    </Card>
  );
}
```

**Implementation note:** Use your framework's reactivity system (Vue's `ref`, `computed`, `watch`).

### 4.3 Validation & Warnings

**Real-time Validation:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  level: 'error';
  field: string;
  message: string;
}

interface ValidationWarning {
  level: 'warning' | 'info';
  field: string;
  message: string;
}
```

**Example Validations:**

```
❌ ERROR: "Rule #1 has no conditions"
❌ ERROR: "Rule #2 has no actions"
❌ ERROR: "Buy amount must be greater than 0"
⚠️  WARNING: "This strategy never triggers (0 matches in 5 years)"
⚠️  WARNING: "This triggers very frequently (500+ times per year)"
ℹ️  INFO: "RSI period of 14 is the most common setting"
```

**Validation UI:**
```
┌─────────────────────────────────────────┐
│  ⚠️  Strategy Issues                    │
├─────────────────────────────────────────┤
│  ❌ Rule #1: No conditions defined      │
│     Add at least one condition          │
│                                         │
│  ⚠️  Rule #2: Triggers very rarely      │
│     Only 3 matches in 5 years          │
│     Consider adjusting thresholds       │
└─────────────────────────────────────────┘
```

### 4.4 Pre-built Templates

Show existing strategies as templates:

```
┌─────────────────────────────────────────────────────────────┐
│  Start from Template                            [Build Custom] │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐   │
│  │ Weekly DCA    │  │ RSI Smart DCA │  │ Dip Buyer    │   │
│  │               │  │               │  │              │   │
│  │ Buy $100      │  │ Buy when      │  │ Buy on 10%   │   │
│  │ every Monday  │  │ RSI < 30      │  │ price drops  │   │
│  │               │  │               │  │              │   │
│  │ [Use Template]│  │ [Use Template]│  │ [Use Template│   │
│  └───────────────┘  └───────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

When user clicks "Use Template":
- Load pre-built rules into builder
- User can see the rules and modify them
- Saves as new custom strategy (not linked to template)

---

## 5. Backend Extensions

### 5.1 Custom Strategy Engine

**New Service: `CustomStrategyService`**

```typescript
// src/strategies/custom-strategy/custom-strategy.service.ts

@Injectable()
export class CustomStrategyService implements IStrategy {
  constructor(
    private readonly marketDataService: MarketDataService,
  ) {}

  async execute(
    config: CustomStrategyConfig,
    marketData: MarketData[],
    portfolio: Portfolio,
    fundingSchedule?: FundingSchedule
  ): Promise<StrategyResult> {
    const transactions: Transaction[] = [];
    const portfolioHistory: PortfolioSnapshot[] = [];
    
    // Initialize state
    let currentPortfolio = { ...portfolio };
    
    // Iterate through each day
    for (let i = 0; i < marketData.length; i++) {
      const currentDate = marketData[i].timestamp;
      const currentPrice = marketData[i].close;
      
      // Apply funding if scheduled
      if (fundingSchedule) {
        const funding = this.calculateFunding(
          currentDate,
          fundingSchedule
        );
        if (funding > 0) {
          currentPortfolio.usdcAmount += funding;
        }
      }
      
      // Evaluate each rule
      for (const rule of config.rules) {
        const shouldExecute = await this.evaluateRule(
          rule,
          {
            date: currentDate,
            price: currentPrice,
            portfolio: currentPortfolio,
            marketData: marketData.slice(0, i + 1), // Historical data up to now
          }
        );
        
        if (shouldExecute) {
          const result = await this.executeActions(
            rule.then,
            currentPortfolio,
            currentPrice
          );
          
          if (result.transaction) {
            transactions.push(result.transaction);
          }
          currentPortfolio = result.portfolio;
        }
      }
      
      // Record portfolio state
      portfolioHistory.push({
        timestamp: currentDate,
        portfolioValue: this.calculatePortfolioValue(
          currentPortfolio,
          currentPrice
        ),
        btcQuantity: currentPortfolio.btcQuantity,
        usdcAmount: currentPortfolio.usdcAmount,
      });
    }
    
    // Calculate metrics
    const metrics = this.calculateMetrics(
      transactions,
      portfolioHistory,
      portfolio,
      marketData
    );
    
    return {
      strategyId: 'custom-strategy',
      strategyName: 'Custom Strategy',
      variantName: config.name,
      parameters: config,
      metrics,
      transactions,
      portfolioValueHistory: portfolioHistory,
    };
  }
  
  private async evaluateRule(
    rule: CustomRule,
    context: EvaluationContext
  ): Promise<boolean> {
    // Evaluate WHEN conditions
    return this.evaluateWhen(rule.when, context);
  }
  
  private async evaluateWhen(
    when: WhenCondition,
    context: EvaluationContext
  ): Promise<boolean> {
    switch (when.type) {
      case 'schedule':
        return this.evaluateSchedule(when, context);
      
      case 'price_change':
        return this.evaluatePriceChange(when, context);
      
      case 'indicator':
        return this.evaluateIndicator(when, context);
      
      case 'and':
        return this.evaluateAnd(when.conditions, context);
      
      case 'or':
        return this.evaluateOr(when.conditions, context);
      
      default:
        throw new Error(`Unknown condition type: ${when.type}`);
    }
  }
  
  private evaluateSchedule(
    condition: ScheduleCondition,
    context: EvaluationContext
  ): boolean {
    const date = new Date(context.date);
    
    switch (condition.frequency) {
      case 'daily':
        return true; // Every day
      
      case 'weekly':
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const targetDay = this.dayNameToNumber(condition.dayOfWeek);
        return dayOfWeek === targetDay;
      
      case 'monthly':
        const dayOfMonth = date.getDate();
        return dayOfMonth === condition.dayOfMonth;
      
      default:
        return false;
    }
  }
  
  private evaluatePriceChange(
    condition: PriceChangeCondition,
    context: EvaluationContext
  ): boolean {
    const { price, marketData } = context;
    
    // Find reference price
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
      default:
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
  
  private async executeActions(
    actions: ThenAction[],
    portfolio: Portfolio,
    currentPrice: number
  ): Promise<{ portfolio: Portfolio; transaction?: Transaction }> {
    let updatedPortfolio = { ...portfolio };
    let transaction: Transaction | undefined;
    
    for (const action of actions) {
      switch (action.type) {
        case 'buy_fixed':
          const result = this.executeBuyFixed(
            action,
            updatedPortfolio,
            currentPrice
          );
          updatedPortfolio = result.portfolio;
          transaction = result.transaction;
          break;
        
        case 'buy_percentage':
          const result2 = this.executeBuyPercentage(
            action,
            updatedPortfolio,
            currentPrice
          );
          updatedPortfolio = result2.portfolio;
          transaction = result2.transaction;
          break;
      }
    }
    
    return { portfolio: updatedPortfolio, transaction };
  }
  
  private executeBuyFixed(
    action: BuyFixedAction,
    portfolio: Portfolio,
    currentPrice: number
  ): { portfolio: Portfolio; transaction: Transaction } {
    const { amount } = action;
    
    // Check if sufficient funds
    if (portfolio.usdcAmount < amount) {
      return { portfolio, transaction: null };
    }
    
    // Calculate BTC quantity (assuming 0.1% fee)
    const fee = amount * 0.001;
    const netAmount = amount - fee;
    const btcQuantity = netAmount / currentPrice;
    
    // Update portfolio
    const updatedPortfolio = {
      btcQuantity: portfolio.btcQuantity + btcQuantity,
      usdcAmount: portfolio.usdcAmount - amount,
    };
    
    // Create transaction record
    const transaction: Transaction = {
      type: 'buy',
      timestamp: new Date(),
      price: currentPrice,
      quantity: btcQuantity,
      amount,
      fee,
      reason: 'Custom strategy rule triggered',
    };
    
    return { portfolio: updatedPortfolio, transaction };
  }
}
```

### 5.2 Refactoring Existing Strategies

**Convert existing strategies to pre-built custom strategies:**

```typescript
// src/strategies/dca/dca.strategy.ts

@Injectable()
export class DCAStrategy implements IStrategy {
  constructor(
    private readonly customStrategyService: CustomStrategyService,
  ) {}

  async execute(
    config: DCAConfig,
    marketData: MarketData[],
    portfolio: Portfolio,
    fundingSchedule?: FundingSchedule
  ): Promise<StrategyResult> {
    // Convert DCA parameters to custom strategy rules
    const customConfig: CustomStrategyConfig = {
      name: `DCA ${config.frequency}`,
      rules: [
        {
          id: 'dca_rule_1',
          when: {
            type: 'schedule',
            frequency: config.frequency, // 'daily', 'weekly', 'monthly'
            dayOfWeek: config.frequency === 'weekly' ? 'monday' : undefined,
            dayOfMonth: config.frequency === 'monthly' ? 1 : undefined,
          },
          then: [
            {
              type: config.spendType === 'fixed' ? 'buy_fixed' : 'buy_percentage',
              amount: config.spendType === 'fixed' ? config.spendAmount : undefined,
              percentage: config.spendType === 'percentage' ? config.spendPercentage / 100 : undefined,
            }
          ],
        },
      ],
    };
    
    // Execute using custom strategy engine
    return this.customStrategyService.execute(
      customConfig,
      marketData,
      portfolio,
      fundingSchedule
    );
  }
}
```

**Benefits of this approach:**
- Single execution engine (less code to maintain)
- Existing strategies become "templates" for custom builder
- Users can see how pre-built strategies work under the hood
- Easy to add new strategies (just create new rule configurations)

### 5.3 New API Endpoints

#### Validate Custom Strategy

```typescript
// src/strategies/custom-strategy/custom-strategy.controller.ts

@Controller('api/v1/strategies')
export class CustomStrategyController {
  @Post('validate')
  @Public()
  async validate(
    @Body() config: CustomStrategyConfig
  ): Promise<ValidationResult> {
    return this.customStrategyService.validate(config);
  }
}

// Response:
{
  "valid": true,
  "errors": [],
  "warnings": [
    {
      "level": "warning",
      "field": "rules[0].when",
      "message": "This condition only triggers 3 times in 5 years"
    }
  ]
}
```

---

## 6. Data Models & API Contracts

### 6.1 Custom Strategy Data Model

```typescript
// Custom Strategy Configuration
interface CustomStrategyConfig {
  name: string;                    // User-defined name
  description?: string;            // Optional description
  rules: CustomRule[];             // Array of rules
}

// Rule Definition
interface CustomRule {
  id: string;                      // Unique rule ID
  when: WhenCondition;             // Conditions
  then: ThenAction[];              // Actions to execute
  enabled?: boolean;               // Default: true
}

// WHEN Conditions
type WhenCondition = 
  | ScheduleCondition
  | PriceChangeCondition
  | IndicatorCondition
  | AndCondition
  | OrCondition;

interface ScheduleCondition {
  type: 'schedule';
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  dayOfMonth?: number;             // 1-28
  time?: string;                   // HH:MM format
}

interface PriceChangeCondition {
  type: 'price_change';
  direction: 'drop' | 'rise';
  threshold: number;               // 0-1 (e.g., 0.10 = 10%)
  referencePoint: '24h_high' | '7d_high' | '30d_high' | 'ath';
}

interface IndicatorCondition {
  type: 'indicator';
  indicator: 'rsi' | 'ma' | 'macd' | 'bollinger';
  params: Record<string, any>;     // Indicator-specific params
  operator: 'less_than' | 'greater_than' | 'equals' | 'crosses_above' | 'crosses_below';
  value: number;
}

interface AndCondition {
  type: 'and';
  conditions: WhenCondition[];
}

interface OrCondition {
  type: 'or';
  conditions: WhenCondition[];
}

// THEN Actions
type ThenAction =
  | BuyFixedAction
  | BuyPercentageAction
  | SellAction
  | RebalanceAction;

interface BuyFixedAction {
  type: 'buy_fixed';
  amount: number;                  // USD amount
}

interface BuyPercentageAction {
  type: 'buy_percentage';
  percentage: number;              // 0-1 (e.g., 0.5 = 50% of available cash)
}

interface SellAction {
  type: 'sell_fixed';
  amount: number;                  // USD value to sell
}

interface RebalanceAction {
  type: 'rebalance';
  targetAllocation: number;        // 0-1 (e.g., 0.8 = 80% BTC)
  threshold: number;               // Rebalance if off by this much
}
```

### 6.2 API Request/Response Examples

#### POST /api/v1/backtest/compare (with custom strategy)

**Request:**
```json
{
  "strategies": [
    {
      "strategyId": "dca",
      "parameters": {
        "frequency": "weekly",
        "spendType": "fixed",
        "spendAmount": 100
      },
      "variantName": "Weekly DCA $100"
    },
    {
      "strategyId": "custom-strategy",
      "parameters": {
        "name": "My Smart DCA",
        "rules": [
          {
            "id": "rule_1",
            "when": {
              "type": "schedule",
              "frequency": "weekly",
              "dayOfWeek": "monday"
            },
            "then": [
              {
                "type": "buy_fixed",
                "amount": 100
              }
            ]
          },
          {
            "id": "rule_2",
            "when": {
              "type": "price_change",
              "direction": "drop",
              "threshold": 0.10,
              "referencePoint": "7d_high"
            },
            "then": [
              {
                "type": "buy_fixed",
                "amount": 50
              }
            ]
          }
        ]
      },
      "variantName": "My Smart DCA"
    }
  ],
  "startDate": "2020-01-01",
  "endDate": "2025-11-28",
  "initialPortfolio": {
    "assets": [],
    "usdcAmount": 0
  },
  "fundingSchedule": {
    "frequency": "weekly",
    "amount": 100
  },
  "timeframe": "1d"
}
```

**Response:**
```json
{
  "results": [
    {
      "strategyId": "dca",
      "strategyName": "DCA (Dollar-Cost Averaging)",
      "variantName": "Weekly DCA $100",
      "parameters": { ... },
      "metrics": {
        "totalReturn": 150.5,
        "totalReturnPercentage": 150.5,
        "avgBuyPrice": 35000,
        "maxDrawdown": 25.3,
        "finalValue": 25050,
        "sharpeRatio": 1.2,
        "totalInvestment": 10000,
        "totalQuantity": 0.715
      },
      "transactions": [
        {
          "type": "buy",
          "timestamp": "2020-01-06T00:00:00.000Z",
          "price": 7400,
          "quantity": 0.0135,
          "amount": 100,
          "fee": 0.1,
          "reason": "DCA weekly purchase"
        }
      ],
      "portfolioValueHistory": [
        {
          "timestamp": "2020-01-01T00:00:00.000Z",
          "portfolioValue": 0,
          "btcQuantity": 0,
          "usdcAmount": 0
        },
        {
          "timestamp": "2020-01-02T00:00:00.000Z",
          "portfolioValue": 100,
          "btcQuantity": 0,
          "usdcAmount": 100
        }
      ]
    },
    {
      "strategyId": "custom-strategy",
      "strategyName": "Custom Strategy",
      "variantName": "My Smart DCA",
      "parameters": {
        "name": "My Smart DCA",
        "rules": [ ... ]
      },
      "metrics": {
        "totalReturn": 180.2,
        "totalReturnPercentage": 180.2,
        "avgBuyPrice": 32500,
        "maxDrawdown": 22.1,
        "finalValue": 28020,
        "sharpeRatio": 1.4,
        "totalInvestment": 10000,
        "totalQuantity": 0.862
      },
      "transactions": [ ... ],
      "portfolioValueHistory": [ ... ]
    }
  ],
  "metadata": {
    "startDate": "2020-01-01",
    "endDate": "2025-11-28",
    "timeframe": "1d",
    "calculatedAt": "2025-12-04T12:00:00.000Z"
  }
}
```

---

## 7. User Flows

### 7.1 Flow: Create Custom Strategy from Scratch

```
1. User on Playground Page
   ├─ Sees buttons: [Add DCA] [Add RSI DCA] [Add Custom]
   └─ Clicks [Add Custom]

2. Navigate to Strategy Builder Page
   ├─ Empty canvas with "Add Rule" button
   └─ Preview panel shows: "No rules defined"

3. User clicks [+ Add Rule]
   ├─ Rule #1 block appears
   └─ Shows empty WHEN and THEN sections

4. User clicks [+ Add Condition] in WHEN section
   ├─ Modal opens: "Choose condition type"
   ├─ User selects "⏰ Time-Based > Regular schedule"
   └─ Configuration modal opens

5. User configures schedule
   ├─ Selects: Frequency = Weekly, Day = Monday
   ├─ Preview shows: "Will trigger ~260 times in 5 years"
   └─ Clicks [Save]

6. Condition appears in WHEN section
   └─ Shows: "Every Monday"

7. User clicks [+ Add Action] in THEN section
   ├─ Modal opens: "Choose action type"
   ├─ User selects "💰 Buy fixed amount"
   └─ Enters: $100

8. Action appears in THEN section
   └─ Shows: "Buy $100 of BTC"

9. Preview panel updates in real-time
   ├─ "📊 This strategy would trigger: 260 times"
   ├─ "💰 Estimated investment: $26,000 over 5 years"
   └─ "⚠️ Warning: This is very frequent (1x per week)"

10. User adds Strategy Name
    └─ Types: "My Weekly DCA"

11. User clicks [Save & Add to Comparison]
    ├─ Validation runs
    ├─ Success: Navigate back to Playground
    └─ Custom strategy appears in selected strategies list

12. Back on Playground
    ├─ "My Weekly DCA" shows in strategy pills
    ├─ Can configure funding schedule ($100/week)
    ├─ Can configure date range (2020-2025)
    └─ User clicks [Compare Strategies]

13. API Call
    ├─ POST /api/v1/backtest/compare
    ├─ Includes custom strategy with rules
    └─ Backend executes using CustomStrategyService

14. Results Display
    ├─ Chart shows "My Weekly DCA" alongside other strategies
    ├─ Metrics table shows performance
    └─ User can click [Share] to create shareable link
```

### 7.2 Flow: Start from Template

```
1. User clicks [Add Custom] on Playground

2. Strategy Builder Page loads
   └─ Shows: [Start from Template] [Build from Scratch]

3. User clicks [Start from Template]
   ├─ Template library appears
   └─ Shows cards: Weekly DCA, RSI Smart DCA, Dip Buyer, etc.

4. User clicks [Use Template] on "RSI Smart DCA"
   ├─ Template rules load into builder
   └─ User sees pre-configured rules:
       Rule #1:
         WHEN: Every Monday
         THEN: Buy $100
       Rule #2:
         WHEN: RSI(14) < 30
         THEN: Buy $50

5. User can modify template
   ├─ Changes Rule #2 threshold: RSI < 25
   ├─ Changes Rule #2 action: Buy $75
   └─ Preview updates accordingly

6. User clicks [Save & Add to Comparison]
   └─ Saves as new custom strategy (not linked to template)

7. Back to Playground with modified strategy
```

### 7.3 Flow: Edit Existing Custom Strategy

```
1. User on Playground with custom strategy selected
   └─ "My Smart DCA" pill shows [Edit] button

2. User clicks [Edit]
   └─ Navigate to Strategy Builder with rules pre-loaded

3. User modifies rules
   ├─ Adds new condition to Rule #1
   ├─ Changes buy amount in Rule #2
   └─ Preview updates in real-time

4. User clicks [Save & Add to Comparison]
   └─ Navigate back to Playground with updated strategy

5. Comparison updates with new configuration
```

---

## 8. Implementation Phases

### Phase 1: MVP (Weeks 1-4)

**Goal:** Basic custom strategy builder with time-based rules

**Frontend:**
- ✅ Strategy Builder Page UI
- ✅ Rule Block components (WHEN/THEN sections)
- ✅ Schedule condition builder
- ✅ Buy fixed amount action
- ✅ Buy percentage action
- ✅ Preview stats calculation (client-side)
- ✅ Integration with existing Playground page
- ✅ Navigation flow (Playground ↔ Builder)

**Backend:**
- ✅ CustomStrategyService (basic)
- ✅ Schedule condition evaluation
- ✅ Buy action execution
- ✅ Integration with existing backtest API
- ✅ Refactor DCA strategy to use custom engine

**Testing:**
- ✅ Can create strategy: "Buy $100 every Monday"
- ✅ Backtest matches existing DCA strategy results
- ✅ Preview stats are accurate
- ✅ Integration with comparison page works

**Out of Scope (Phase 1):**
- ❌ Indicator-based conditions (RSI, MA, etc.)
- ❌ Price-based conditions (dip detection)
- ❌ AND/OR logic combinators
- ❌ Multiple actions per rule
- ❌ Strategy saving/CRUD

### Phase 2: Advanced Conditions (Weeks 5-7)

**Goal:** Add indicator and price-based conditions

**Frontend:**
- ✅ Price change condition builder
- ✅ Indicator condition builder (RSI, MA)
- ✅ Client-side indicator calculations
- ✅ Enhanced preview with condition trigger counts
- ✅ Indicator configuration modals

**Backend:**
- ✅ Price change evaluation
- ✅ Indicator evaluation (for indicators calculated client-side)
- ✅ Refactor RSI DCA, Dip Buyer, MA DCA strategies

**Testing:**
- ✅ Can create: "Buy when price drops 10%"
- ✅ Can create: "Buy when RSI < 30"
- ✅ Results match existing RSI DCA strategy
- ✅ Preview accurately shows trigger counts

### Phase 3: Logic Combinators (Weeks 8-9)

**Goal:** AND/OR logic, nested conditions

**Frontend:**
- ✅ AND/OR toggle UI
- ✅ Nested condition groups
- ✅ Visual indication of logic flow
- ✅ Validation for illogical combinations

**Backend:**
- ✅ AND condition evaluation
- ✅ OR condition evaluation
- ✅ Nested group evaluation

**Testing:**
- ✅ Can create: "Monday AND RSI < 30"
- ✅ Can create: "(Monday OR Wednesday) AND (RSI < 30 OR Price drops 10%)"
- ✅ Results match expected behavior

### Phase 4: Polish & Advanced Features (Weeks 10-12)

**Goal:** Strategy saving, templates, sharing

**Frontend:**
- ✅ Template library UI
- ✅ Strategy name/description editor
- ✅ Enhanced validation & warnings
- ✅ Undo/redo functionality

**Backend:**
- ✅ Strategy CRUD endpoints (if needed)
- ✅ All 7 existing strategies refactored
- ✅ Performance optimizations

**Testing:**
- ✅ All existing strategies can be replicated in builder
- ✅ Backtest performance < 5 seconds for 5 years
- ✅ Custom strategies work in share links
- ✅ Cross-browser testing

---

## 9. Acceptance Criteria

### 9.1 MVP (Phase 1)

✅ **User can create time-based strategy**
- Create strategy: "Buy $100 every Monday"
- Backtest produces accurate results
- Results match existing DCA strategy with same parameters

✅ **Preview stats are accurate**
- Shows correct trigger count (e.g., 260 for weekly over 5 years)
- Shows estimated investment amount
- Updates in real-time as user edits

✅ **Integration with Playground**
- [Add Custom] button navigates to Strategy Builder
- After saving, returns to Playground with strategy added
- Custom strategy appears in comparison results
- Results chart and metrics table display correctly

✅ **Validation works**
- Cannot save strategy with no rules
- Cannot save rule with no conditions or actions
- Shows appropriate warnings

### 9.2 Phase 2

✅ **Price-based conditions work**
- Can create: "Buy when price drops 10% from 7-day high"
- Results match expectations from backtesting

✅ **Indicator conditions work**
- Can create: "Buy when RSI < 30"
- Results match existing RSI DCA strategy
- Indicators calculated correctly client-side

✅ **Template system**
- All 7 existing strategies available as templates
- User can load template and modify
- Modified template saves as new custom strategy

### 9.3 Phase 3

✅ **Logic combinators**
- Can combine conditions with AND
- Can combine conditions with OR
- Nested groups work correctly

✅ **Complex strategies**
- Can replicate Combined Smart DCA using builder
- Results match existing Combined Smart DCA exactly

### 9.4 Phase 4

✅ **All strategies refactored**
- Every existing strategy uses CustomStrategyService under the hood
- No duplicate execution logic
- Performance is same or better than before

✅ **Production ready**
- Handles errors gracefully
- Loading states for all async operations
- Works on desktop and tablet
- Cross-browser compatibility

✅ **Performance targets**
- Strategy builder page loads < 2 seconds
- Preview calculations < 1 second
- Backtest execution < 5 seconds (5 years)
- UI remains responsive during calculations

---

## 10. Technical Considerations

### 10.1 State Management

**Strategy Builder State Structure:**

Use your framework's state management solution (Vuex, Pinia, or Composition API) to manage:

```typescript
interface StrategyBuilderState {
  // Current strategy being edited
  currentStrategy: CustomStrategyConfig | null;
  
  // Validation state
  validation: ValidationResult | null;
  
  // Preview stats
  previewStats: PreviewStats | null;
  
  // UI state
  isCalculating: boolean;
  isSaving: boolean;
}

// Required actions/mutations:
interface StrategyBuilderActions {
  addRule: () => void;
  updateRule: (ruleId: string, rule: CustomRule) => void;
  deleteRule: (ruleId: string) => void;
  setStrategyName: (name: string) => void;
  calculatePreview: () => Promise<void>;
  saveStrategy: () => Promise<void>;
  loadTemplate: (templateId: string) => void;
  reset: () => void;
}

// Example logic for addRule (pseudocode):
addRule() {
  const strategy = this.currentStrategy;
  if (!strategy) return;
  
  const newRule: CustomRule = {
    id: `rule_${Date.now()}`,
    when: { type: 'schedule', frequency: 'weekly', dayOfWeek: 'monday' },
    then: [{ type: 'buy_fixed', amount: 100 }],
    enabled: true,
  };
  
  this.currentStrategy = {
    ...strategy,
    rules: [...strategy.rules, newRule],
  };
}

// Implement other actions following your framework's patterns
```

**Note:** Implement using your project's state management conventions.
```

### 10.2 Client-Side Indicator Calculation

**Using technicalindicators library:**

```typescript
import { RSI, SMA, MACD, BollingerBands } from 'technicalindicators';

class IndicatorService {
  async fetchCandles(
    symbol: string,
    timeframe: string,
    startDate: string,
    endDate: string
  ): Promise<Candle[]> {
    const response = await api.get('/api/v1/market-data/candles', {
      params: { symbol, timeframe, startDate, endDate },
    });
    return response.data;
  }
  
  calculateRSI(candles: Candle[], period: number = 14): number[] {
    const closes = candles.map(c => c.close);
    return RSI.calculate({ values: closes, period });
  }
  
  calculateSMA(candles: Candle[], period: number = 50): number[] {
    const closes = candles.map(c => c.close);
    return SMA.calculate({ values: closes, period });
  }
  
  calculateMACD(candles: Candle[]): MACDOutput[] {
    const closes = candles.map(c => c.close);
    return MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
  }
  
  async countTriggers(
    condition: WhenCondition,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const candles = await this.fetchCandles(
      'BTC/USD',
      '1d',
      startDate,
      endDate
    );
    
    let triggerCount = 0;
    
    for (let i = 0; i < candles.length; i++) {
      const context = {
        date: candles[i].timestamp,
        price: candles[i].close,
        candles: candles.slice(0, i + 1),
      };
      
      if (this.evaluateCondition(condition, context)) {
        triggerCount++;
      }
    }
    
    return triggerCount;
  }
  
  private evaluateCondition(
    condition: WhenCondition,
    context: any
  ): boolean {
    // Evaluate condition against context
    // Similar logic to backend evaluation
    // ...
  }
}
```

### 10.3 Validation Strategy

**Frontend Validation (Real-time):**
- Check for empty rules
- Check for empty conditions/actions
- Validate parameter ranges
- Estimate trigger frequency
- Show warnings for edge cases

**Backend Validation (On save/execute):**
- Same checks as frontend (defense in depth)
- Additional business logic validation
- Security checks (e.g., max buy amount)
- Return detailed error messages

### 10.4 Performance Optimization

**Client-Side:**
- Debounce preview calculations (500ms)
- Cache candle data (avoid re-fetching)
- Use Web Workers for heavy calculations
- Virtualize long lists (if many rules)

**Server-Side:**
- Cache indicator calculations
- Optimize database queries
- Use connection pooling
- Add indexes for common queries

### 10.5 Error Handling

**Frontend:**
```typescript
try {
  const result = await api.post('/api/v1/backtest/compare', payload);
  // Handle success
} catch (error) {
  if (error.response?.status === 400) {
    // Validation error
    showToast('Invalid strategy configuration', 'error');
  } else if (error.response?.status === 500) {
    // Server error
    showToast('Failed to run backtest. Please try again.', 'error');
  } else {
    // Network error
    showToast('Network error. Please check your connection.', 'error');
  }
}
```

**Backend:**
```typescript
@Post('compare')
@Public()
async compare(@Body() dto: CompareStrategiesDto): Promise<ComparisonResult> {
  try {
    // Validate input
    await this.validateDto(dto);
    
    // Execute backtest
    return await this.backtestService.compare(dto);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new BadRequestException(error.message);
    } else if (error instanceof InsufficientDataError) {
      throw new BadRequestException('Insufficient market data for this date range');
    } else {
      this.logger.error('Backtest failed', error);
      throw new InternalServerErrorException('Failed to execute backtest');
    }
  }
}
```

---

## 11. Future Enhancements (Post-MVP)

### 11.1 Strategy Saving & Management

- Save custom strategies to user account
- "My Strategies" page to browse/edit saved strategies
- Share saved strategies (public/private)
- Fork other users' strategies
- Version history

### 11.2 Advanced Features

- **Stop Loss / Take Profit**: Exit rules
- **Portfolio Rebalancing**: Maintain target allocation
- **Multi-Condition Actions**: "If A then X, else if B then Y"
- **Action Modifiers**: "Buy 2x amount if RSI < 25"
- **Time-based Actions**: "Sell 20% on specific date"

### 11.3 Social Features

- Community strategy library
- Upvote/downvote strategies
- Comments and discussions
- Strategy performance leaderboard
- "Trending strategies this week"

### 11.4 AI Assistance

- "Suggest improvements to my strategy"
- "Generate strategy from description"
- "Find similar strategies"
- Backtesting optimization (genetic algorithms)

### 11.5 Multi-Asset Support

- Support for ETH, BNB, other cryptos
- Multi-asset portfolios
- Cross-asset conditions ("If BTC drops and ETH drops")
- Correlation analysis

---

## 12. Success Metrics

### 12.1 Product Metrics

**Engagement:**
- % of users who click [Add Custom]
- % who complete strategy creation (save & add)
- Average time spent in Strategy Builder
- Number of rules per custom strategy

**Adoption:**
- Custom strategies as % of total comparisons
- Custom strategies that replicate existing strategies (validation)
- Custom strategies that diverge from templates (innovation)

**Quality:**
- Validation error rate
- Backtest success rate (vs. failures)
- Average trigger frequency of custom strategies
- Distribution of strategy complexity (simple vs. complex)

### 12.2 Technical Metrics

**Performance:**
- Strategy Builder page load time
- Preview calculation time
- Backtest execution time
- API error rate

**Usage:**
- Peak concurrent users
- API requests per day
- Database query performance
- Cache hit rate

### 12.3 Success Criteria

**Phase 1 Success:**
- ✅ 20% of users try custom strategy builder
- ✅ 50% of those complete strategy creation
- ✅ 0 critical bugs in production
- ✅ Backtest performance < 5 seconds

**Phase 2 Success:**
- ✅ 30% of users use advanced conditions
- ✅ Custom strategies match existing strategy results
- ✅ Average 2-3 rules per custom strategy

**Phase 3 Success:**
- ✅ Users can replicate all 7 existing strategies
- ✅ 10% of custom strategies use AND/OR logic
- ✅ Positive user feedback (NPS > 40)

---

## 13. Open Questions & Decisions Needed

### 13.1 Product Decisions

1. **Strategy Naming:**
   - Required field or auto-generate name?
   - Character limits?
   - Uniqueness constraints?

2. **Rule Limits:**
   - Max rules per strategy? (suggest: 10)
   - Max conditions per rule? (suggest: 5)
   - Max actions per rule? (suggest: 3)

3. **Validation Strictness:**
   - Block save if strategy never triggers?
   - Or just show warning?

4. **Template System:**
   - Should templates be editable?
   - Should we track "derived from template X"?

### 13.2 Technical Decisions

1. **Indicator Calculation:**
   - All client-side? (Phase 1 approach)
   - Or add backend indicator API? (for caching/performance)

2. **Database Schema:**
   - Store custom strategies in DB (for saving feature)?
   - Or only in-memory for MVP?

3. **Caching Strategy:**
   - Client-side: localStorage vs. IndexedDB?
   - Server-side: Redis vs. in-memory?

4. **Execution Model:**
   - Synchronous (simple, may be slow)
   - Async with progress updates (complex, better UX)

---

## Appendix A: Example Custom Strategy Configurations

### A.1 Weekly DCA

```json
{
  "name": "Weekly DCA",
  "rules": [
    {
      "id": "rule_1",
      "when": {
        "type": "schedule",
        "frequency": "weekly",
        "dayOfWeek": "monday"
      },
      "then": [
        {
          "type": "buy_fixed",
          "amount": 100
        }
      ]
    }
  ]
}
```

### A.2 RSI Smart DCA

```json
{
  "name": "RSI Smart DCA",
  "rules": [
    {
      "id": "rule_1",
      "when": {
        "type": "schedule",
        "frequency": "weekly",
        "dayOfWeek": "monday"
      },
      "then": [
        {
          "type": "buy_fixed",
          "amount": 100
        }
      ]
    },
    {
      "id": "rule_2",
      "when": {
        "type": "indicator",
        "indicator": "rsi",
        "params": { "period": 14 },
        "operator": "less_than",
        "value": 30
      },
      "then": [
        {
          "type": "buy_fixed",
          "amount": 50
        }
      ]
    }
  ]
}
```

### A.3 Dip Buyer

```json
{
  "name": "Dip Buyer",
  "rules": [
    {
      "id": "rule_1",
      "when": {
        "type": "price_change",
        "direction": "drop",
        "threshold": 0.10,
        "referencePoint": "7d_high"
      },
      "then": [
        {
          "type": "buy_percentage",
          "percentage": 0.5
        }
      ]
    }
  ]
}
```

### A.4 Combined Smart DCA

```json
{
  "name": "Combined Smart DCA",
  "rules": [
    {
      "id": "rule_1",
      "when": {
        "type": "and",
        "conditions": [
          {
            "type": "schedule",
            "frequency": "weekly",
            "dayOfWeek": "monday"
          },
          {
            "type": "or",
            "conditions": [
              {
                "type": "indicator",
                "indicator": "rsi",
                "params": { "period": 14 },
                "operator": "less_than",
                "value": 30
              },
              {
                "type": "price_change",
                "direction": "drop",
                "threshold": 0.10,
                "referencePoint": "7d_high"
              }
            ]
          }
        ]
      },
      "then": [
        {
          "type": "buy_fixed",
          "amount": 150
        }
      ]
    },
    {
      "id": "rule_2",
      "when": {
        "type": "schedule",
        "frequency": "weekly",
        "dayOfWeek": "monday"
      },
      "then": [
        {
          "type": "buy_fixed",
          "amount": 100
        }
      ]
    }
  ]
}
```

---

## Appendix B: API Specification Summary

### B.1 Existing APIs (No Changes)

```
GET /api/v1/market-data/candles
POST /api/v1/backtest/compare
POST /api/v1/backtest/share
GET /api/v1/backtest/share/:shortCode
```

### B.2 New APIs (To Implement)

```
POST /api/v1/strategies/validate
  Body: CustomStrategyConfig
  Response: ValidationResult

POST /api/v1/strategies (Future - Phase 4)
  Body: CustomStrategyConfig
  Response: Saved strategy with ID

GET /api/v1/strategies (Future - Phase 4)
  Response: User's saved strategies

PUT /api/v1/strategies/:id (Future - Phase 4)
DELETE /api/v1/strategies/:id (Future - Phase 4)
```

---

## Appendix C: Validation Rules

### C.1 Strategy-Level Validation

- ✅ Must have at least 1 rule
- ✅ Strategy name required (1-100 characters)
- ✅ Max 10 rules per strategy

### C.2 Rule-Level Validation

- ✅ Must have at least 1 condition in WHEN
- ✅ Must have at least 1 action in THEN
- ✅ Max 5 conditions per rule
- ✅ Max 3 actions per rule

### C.3 Condition-Specific Validation

**Schedule:**
- ✅ Frequency required
- ✅ If weekly, dayOfWeek required
- ✅ If monthly, dayOfMonth required (1-28)
- ✅ Time format: HH:MM (optional)

**Price Change:**
- ✅ Direction required (drop/rise)
- ✅ Threshold: 0.01 - 1.0 (1% - 100%)
- ✅ Reference point required

**Indicator:**
- ✅ Indicator type required
- ✅ Params validated per indicator type
  - RSI period: 2-50
  - MA period: 2-500
- ✅ Operator required
- ✅ Value required (range depends on indicator)

### C.4 Action-Specific Validation

**Buy Fixed:**
- ✅ Amount > 0
- ⚠️ Warning if amount > $1000 (unusually high)

**Buy Percentage:**
- ✅ Percentage: 0.01 - 1.0 (1% - 100%)
- ⚠️ Warning if > 0.5 (>50% of cash is aggressive)

---

## Appendix D: Error Messages

### D.1 Validation Errors

```
❌ "Strategy must have at least one rule"
❌ "Strategy name is required"
❌ "Rule #1: No conditions defined"
❌ "Rule #2: No actions defined"
❌ "Rule #1 Condition: RSI period must be between 2 and 50"
❌ "Rule #2 Action: Buy amount must be greater than 0"
```

### D.2 Warnings

```
⚠️ "Rule #1 will never trigger (0 matches in historical data)"
⚠️ "Rule #2 triggers very rarely (only 3 times in 5 years)"
⚠️ "Rule #3 triggers very frequently (500+ times per year)"
⚠️ "Buy amount of $1000 is unusually high"
⚠️ "Buying 100% of available cash is very aggressive"
```

### D.3 Info Messages

```
ℹ️ "RSI period of 14 is the most common setting"
ℹ️ "This configuration is similar to the 'RSI Smart DCA' template"
ℹ️ "Preview calculated using data from 2020-2025"
```

---

**End of Product Requirements Document**

This PRD provides comprehensive specifications for building the Custom Strategy Builder with full integration into your existing backend infrastructure. The phased approach ensures we can deliver value incrementally while maintaining quality and performance standards.