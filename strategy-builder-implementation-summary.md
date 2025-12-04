# Custom Strategy Builder - Implementation Summary

> **📋 Framework-Agnostic Specification**  
> This specification is framework-agnostic. Implement using **Vue.js** following your `.cursorrules` conventions.  
> All code examples are conceptual pseudocode showing structure, not actual implementation code.

## 📄 Full PRD Location
`/mnt/user-data/outputs/strategy-builder-prd-v2-complete.md` (2179 lines)

## 🎯 Executive Summary

Build a visual, no-code custom strategy builder that:
- Allows users to create sophisticated DCA strategies through block-based interface
- Uses new `custom-strategy` backend engine as backbone for ALL strategies
- Refactors existing 7 strategies as pre-built configurations
- Integrates seamlessly with existing playground and results pages

## 🏗️ Architecture Decision: **Hybrid with Backend Extension (Option B)**

```
Frontend (TypeScript + Your Framework)
  ├── Strategy Builder Page (visual editor)
  ├── Client-side Indicator Engine (preview only)
  └── Existing Playground Integration
  
Backend (NestJS)
  ├── NEW: Custom Strategy Engine
  │   ├── Rule Parser
  │   ├── Strategy Evaluator  
  │   └── Action Executor
  ├── EXTENDED: Backtest API (accepts custom-strategy)
  └── EXISTING: Market Data, Auth, Sharing
```

**Note:** All frontend implementation follows your project's framework conventions (Vue.js) as defined in `.cursorrules`.

## 📋 Key Specifications

### Rule Structure
```typescript
Strategy
  └── Rule[] (execute in order, top to bottom)
      ├── WHEN: ConditionGroup (AND/OR logic)
      │   └── Condition[] (indicator + operator + value)
      └── THEN: Action[] (buy fixed, buy scaled, rebalance, etc.)
```

### Execution Model
- **Funding Model A**: Funding adds to cash pool, rules control spending
- **Rule Execution**: In order (priority 1, 2, 3...), multiple can trigger same day
- **Independence**: Each rule evaluates independently (no if/else between rules)

### Integration Points
- **Entry**: "Add Custom" button on playground page
- **Builder**: Separate page (`/strategy-builder`)
- **Return**: Back to playground with custom strategy added
- **Results**: Works with existing chart/table display

## 🔧 Implementation Phases

### Phase 1: Backend Foundation (Week 1-2)
- Create CustomStrategyEngine class
- Implement indicator calculations (server-side)
- Extend backtest API to accept `custom-strategy`
- Add validation API

**Deliverables:**
✅ Custom strategy engine functional
✅ API accepts and executes custom strategies
✅ Returns same format as existing strategies

### Phase 2: Frontend UI (Week 3-4)
- Create Strategy Builder page
- Build Rule Builder components (Rule, Condition, Action blocks)
- Implement Rule Library sidebar
- State management (Zustand)

**Deliverables:**
✅ Strategy Builder page accessible
✅ Can create rules with conditions and actions
✅ Can configure all parameters

### Phase 3: Validation & Preview (Week 5)
- Client-side indicator calculation (for preview)
- Live Preview panel (trigger count, mini chart)
- Validation system (error/warning/info)
- Test backtest button

**Deliverables:**
✅ Live preview updates as user edits
✅ Validation prevents invalid configurations
✅ Test backtest shows accurate results

### Phase 4: Templates & Integration (Week 6)
- Template system (5 pre-built templates)
- Playground integration ("Add Custom" button)
- Edit custom strategy flow
- Polish and UX

**Deliverables:**
✅ Templates functional
✅ Seamless playground integration
✅ Custom strategies work in comparison

### Phase 5: Testing & Refinement (Week 7)
- End-to-end testing
- Performance optimization
- Bug fixes
- Documentation

**Deliverables:**
✅ All critical bugs fixed
✅ Performance meets targets
✅ Ready for production

## 📊 Supported Indicators (10 Total)

1. **RSI** - Period configurable (2-50, default 14)
2. **Moving Average** - SMA/EMA, period configurable (2-500)
3. **MACD** - Fast/slow/signal periods configurable
4. **Bollinger Bands** - Period and std deviation configurable
5. **Price Change %** - Reference point and lookback configurable
6. **Volatility (ATR)** - Period configurable
7. **Volume Change** - Compare to X-day average
8. **Consecutive Days** - Count red or green days
9. **Fibonacci Retracement** - Auto-calculate from swing
10. **Time Schedule** - Day of week, day of month

## 💰 Supported Actions (7 Total)

1. **Buy Fixed Amount** - Purchase specific USD amount
2. **Buy Scaled Amount** - Amount scales with condition severity
3. **Buy Percentage** - Invest X% of portfolio/cash
4. **Buy Ladder** - Split purchase across price levels
5. **Limit Order** - Buy order at specific price
6. **Rebalance Portfolio** - Maintain target allocation
7. **Send Alert** - Notification only (watch mode)

## 🔗 API Endpoints

### Extended (Existing)
- `POST /api/v1/backtest/compare` - Now accepts `strategyId: "custom-strategy"`

### New
- `POST /api/v1/strategies/validate` - Validate custom strategy before backtest
- `POST /api/v1/strategies/preview` - Quick preview of trigger points

### Unchanged (Existing)
- `GET /api/v1/market-data/candles` - Fetch historical OHLCV data
- `POST /api/v1/backtest/share` - Create shareable link
- `GET /api/v1/backtest/share/:shortCode` - Load shared strategy

## 📝 Example Custom Strategy JSON

```json
{
  "strategyId": "custom-strategy",
  "variantName": "My Smart DCA",
  "parameters": {
    "rules": [
      {
        "id": "rule_1",
        "priority": 1,
        "enabled": true,
        "when": {
          "operator": "AND",
          "conditions": [
            {
              "id": "cond_1",
              "indicator": "rsi",
              "params": { "period": 14 },
              "operator": "less_than",
              "value": 30
            }
          ]
        },
        "then": [
          {
            "id": "action_1",
            "action": "buy_fixed",
            "params": { "amount": 100 }
          }
        ]
      }
    ]
  }
}
```

## ✅ Acceptance Criteria

### Core Functionality
- ✅ User can create custom strategy with multiple rules
- ✅ User can add conditions (indicators + operators + values)
- ✅ User can add actions (buy fixed, buy scaled, rebalance, etc.)
- ✅ Rules execute in order (multiple can trigger same day)
- ✅ Custom strategies produce same results as equivalent pre-built

### Validation & Preview
- ✅ Real-time validation prevents invalid configurations
- ✅ Live preview shows estimated trigger count
- ✅ Mini chart displays trigger points on historical data
- ✅ Test backtest calls backend and displays full results

### Integration
- ✅ "Add Custom" button on playground page
- ✅ Custom strategies appear in selected strategies list
- ✅ Results page displays custom strategies correctly
- ✅ Share functionality works for custom strategies

### Performance
- ✅ Strategy execution < 5 seconds for 5 years of data
- ✅ Live preview calculation < 1 second
- ✅ UI interactions feel instant (< 100ms)

### Templates
- ✅ 5 pre-built templates available
- ✅ Templates replicate existing strategy types
- ✅ User can modify templates after loading

## 🚀 Quick Start for Development

### Backend (Phase 1)
```bash
# 1. Create custom strategy engine
src/strategies/custom-strategy.engine.ts

# 2. Extend backtest service
src/backtest/backtest.service.ts
  - Add support for 'custom-strategy' strategyId
  - Route to CustomStrategyEngine

# 3. Add validation endpoint
src/strategies/strategies.controller.ts
  - POST /validate

# 4. Implement indicator calculations
src/utils/indicators/
  - rsi.calculator.ts
  - ma.calculator.ts
  - etc.
```

### Frontend (Phase 2)
```bash
# 1. Create strategy builder page using your framework structure
src/features/strategy-builder/
  - pages/StrategyBuilderPage.vue  # Or .ts depending on your setup
  - components/
  - composables/  # Or hooks/stores based on your pattern
  - stores/strategyBuilderStore.ts

# 2. Implement core components
  - StrategyCanvas.vue
  - RuleBlock.vue
  - ConditionBlock.vue
  - ActionBlock.vue

# 3. Add to routing
src/router/
  - Add route: /strategy-builder

# 4. Integrate with playground
src/features/playground/
  - Add "Add Custom" button
  - Handle navigation to builder
  - Receive custom strategy on return

# Follow your .cursorrules for:
  - Component structure
  - State management patterns
  - API integration
  - Styling approach
```

## 📚 Additional Resources in Full PRD

- Complete UI mockups and layouts
- Detailed component specifications
- Full API request/response schemas
- TypeScript type definitions
- Testing strategy and examples
- Performance optimization checklist
- Future enhancements roadmap (Phase 2+)
- Glossary of terms

## 🎯 Success Metrics

- Users can replicate any pre-built strategy using custom builder
- Custom strategies execute with same performance as pre-built ones
- 80% of users understand how to add a simple rule within 2 minutes
- Existing comparison features work seamlessly with custom strategies

---

## Next Steps

1. **Review full PRD** (`strategy-builder-prd-v2-complete.md`)
2. **Backend team**: Start Phase 1 (Custom Strategy Engine)
3. **Frontend team**: Review UI specs, prepare component library
4. **DevOps**: Ensure infrastructure can handle additional load
5. **Schedule kick-off meeting** to align on timeline and responsibilities

**Estimated Total Time:** 7 weeks (can be accelerated with parallel work)

---

Generated: December 4, 2025
Document Version: 2.0