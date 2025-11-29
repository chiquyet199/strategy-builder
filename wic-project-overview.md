# WhatIfCrypto - Project Overview

## Vision

WhatIfCrypto is a free, user-friendly platform that lets amateur crypto investors test and compare different trading strategies through backtesting. The goal is to help people answer "what if I had done X instead of Y?" without needing to code or pay for expensive tools.

**Tagline:** "See what your crypto strategy could have done - before risking real money"

## Target Audience

- Amateur crypto investors who want to invest smarter
- Long-term HODLers curious about DCA strategies
- People intimidated by complex trading tools like TradingView
- Beginners who want to learn through experimentation

**NOT targeting:** Active day traders, professional traders, people who want real-time trading

## Core Value Proposition

1. **Simple** - No coding required, just click and compare
2. **Visual** - See multiple strategies side-by-side instantly
3. **Educational** - Learn WHY strategies work or fail
4. **Free** - No subscription required
5. **Focused** - Built specifically for DCA and accumulation strategies

## Differentiation from Competitors

| Feature | WhatIfCrypto | TradingView | Gainium |
|---------|--------------|-------------|---------|
| Target User | Beginner investors | Active traders | Bot users |
| Learning Curve | Minutes | Hours/Days | Hours |
| Cost | Free (ad-supported) | $0-60/month | $29-299/month |
| Focus | Strategy comparison | Technical analysis | Automation |
| Coding Required | No | Yes (Pine Script) | No |

**Positioning:** "TradingView for people who don't want to become traders - they just want to invest smarter"

## MVP Features (Phase 1)

### Core Functionality
- Single asset: Bitcoin (BTC/USD)
- Time period: 2020-01-01 to 2025-11-28
- 5-7 preset strategies (see below)
- Side-by-side comparison view
- Key metrics display

### User Flow
```
1. Land on homepage
2. Set investment amount (e.g., $10,000)
3. Select time period (dropdown: 2020-2025, 2021-2023, etc.)
4. Select strategies to compare (checkboxes)
5. Click "Compare Strategies"
6. View results dashboard
7. Optional: Download results as image
```

### Preset Strategies (MVP)

1. **Lump Sum** - Buy once at start, hold
2. **Weekly DCA** - Fixed amount every week
3. **Monthly DCA** - Fixed amount every month
4. **RSI DCA** - Buy 2x when RSI < 30, normal when 30-70, skip when > 70
5. **Dip Buyer DCA** - Double purchase on 10%+ drops from recent high
6. **Moving Average DCA** - Buy 2x when price < 200-day MA
7. **Combined Smart DCA** - Mix of RSI + Dip Buying + MA signals

### Results Dashboard

**Visual Elements:**
- Line chart showing portfolio value over time (all strategies overlaid, different colors)
- Legend with strategy names and colors
- Interactive tooltips on hover

**Metrics Table:**
| Strategy | Total Return | Avg Buy Price | Max Drawdown | Final Value | Sharpe Ratio |
|----------|--------------|---------------|--------------|-------------|--------------|
| Strategy 1 | +245% | $28,450 | -32% | $34,500 | 1.85 |
| Strategy 2 | +198% | $31,200 | -28% | $29,800 | 1.62 |

**Additional Features:**
- "What if you invested $X" calculator (adjust investment amount)
- Date range for each buy (show when purchases happened)
- Download chart as PNG (for social sharing)
- Share unique URL with selected comparison

## Monetization Strategy

### Primary Revenue Streams

1. **Exchange Affiliate Links** (Priority 1)
   - Binance, Coinbase, Kraken referral programs
   - CTA: "Ready to start? Trade on [Exchange]"
   - Expected: 20-40% lifetime commission on trading fees
   - Placement: Below results, in navigation

2. **Trading Bot Referrals** (Priority 2)
   - Gainium, 3Commas, Cryptohopper partnerships
   - CTA: "Automate this strategy with [Platform]"
   - Expected: Recurring commissions
   - Placement: "Automate" button next to winning strategy

3. **Display Advertising** (Priority 3)
   - Google AdSense or crypto-specific ad networks
   - Non-intrusive placement (sidebar, bottom)
   - Expected: Low revenue, but passive

4. **Optional Premium Tier** (Future consideration)
   - Free tier: BTC/ETH, 2020-present, 10 strategies
   - Premium ($5-10/month): All coins, historical data to 2015, unlimited custom strategies
   - Only introduce if user demand exists

### Revenue Projections (Rough Estimates)
- 1,000 daily users × 2% conversion × $50 affiliate = $1,000/month
- 10,000 daily users × 2% conversion × $50 affiliate = $10,000/month

## Technical Architecture

### Tech Stack

**Frontend:**
- React + TypeScript (you're already familiar)
- Recharts or Chart.js for visualizations
- Tailwind CSS for styling
- Vite for build tooling

**Data Layer:**
- CoinGecko API (free tier: 10-50 calls/minute)
- Or CryptoCompare API (free tier available)
- Cache data aggressively (localStorage + CDN)

**Hosting:**
- Vercel or Netlify (free tier is generous)
- Cloudflare CDN for cached price data
- No backend needed for MVP (client-side computation)

**Analytics:**
- Google Analytics or Plausible (privacy-focused)
- Track: Strategy comparisons, popular timeframes, sharing

### Data Requirements

**Price Data:**
- Daily OHLC (Open, High, Low, Close) for Bitcoin
- 2020-01-01 to present
- ~2,000 data points (manageable client-side)

**Storage Strategy:**
- Fetch price data once on page load
- Cache in localStorage (expires after 24 hours)
- Compute all strategies client-side
- No database needed for MVP

### Performance Considerations
- Lazy load price data (show skeleton while loading)
- Web workers for heavy calculations (optional optimization)
- Compress price data (use integers, reduce precision)
- Target: Results in < 2 seconds

## Development Roadmap

### Phase 1: MVP (4-6 weeks)
**Goal:** Validate concept, get first users

- [ ] Set up project structure (React + TypeScript)
- [ ] Integrate CoinGecko API for BTC price data
- [ ] Build strategy engine (calculate all 7 strategies)
- [ ] Create comparison UI (strategy selection)
- [ ] Build results dashboard (chart + metrics table)
- [ ] Add basic analytics
- [ ] Launch on ProductHunt
- [ ] Post on Reddit (r/Bitcoin, r/CryptoCurrency)

**Success Metrics:**
- 1,000+ users in first month
- 20%+ users compare 3+ strategies
- Social shares (download feature usage)

### Phase 2: Expand & Optimize (2-3 months)
**Goal:** Add value, improve retention

- [ ] Add Ethereum (ETH/USD)
- [ ] Add top 10 cryptocurrencies
- [ ] User-customizable strategy parameters (e.g., "RSI < X")
- [ ] Save & share comparisons (unique URLs)
- [ ] Mobile optimization
- [ ] Add Fear & Greed Index strategy (if data available)
- [ ] Educational content (blog posts on each strategy)

**Success Metrics:**
- 10,000+ monthly active users
- 50%+ users return within 30 days
- 5%+ click affiliate links

### Phase 3: Monetize & Scale (3-6 months)
**Goal:** Generate revenue, sustainable growth

- [ ] Negotiate exchange affiliate partnerships
- [ ] Add trading bot referral links
- [ ] Implement display advertising
- [ ] Build email list (strategy tips newsletter)
- [ ] Consider premium tier based on user feedback
- [ ] SEO optimization (target "bitcoin dca strategy", etc.)
- [ ] YouTube content (strategy breakdowns)

**Success Metrics:**
- $1,000+ monthly revenue
- 50,000+ monthly active users
- Break-even on hosting costs

### Phase 4: Advanced Features (Future)
- Portfolio mode (multiple assets)
- Custom strategy builder (drag-and-drop)
- Real-time paper trading
- Community-submitted strategies
- API for developers

## Go-to-Market Strategy

### Launch Plan

**Pre-Launch (Week 1-2):**
1. Build landing page with email signup
2. Post teasers on Twitter/X with screenshots
3. Reach out to crypto YouTubers for early feedback
4. Prepare ProductHunt launch assets

**Launch Day:**
1. ProductHunt launch (aim for #1 product of the day)
2. Reddit posts: r/Bitcoin, r/CryptoCurrency, r/SatoshiStreetBets
3. Twitter/X thread with demo video
4. Hacker News submission
5. Email to crypto newsletters (offer exclusive first look)

**Post-Launch (Week 1-4):**
1. Monitor user feedback closely
2. Fix bugs rapidly
3. Create content: "I tested 7 DCA strategies over 5 years - here's what happened"
4. Guest post on crypto blogs
5. Engage with users on social media

### Content Marketing Ideas

**Blog Posts:**
- "Why 90% of Bitcoin investors would do better with DCA"
- "I backtested every DCA strategy - here's the winner"
- "Lump Sum vs DCA: The data might surprise you"
- "How to beat basic DCA by 30% (with proof)"

**Social Content:**
- Weekly strategy spotlight (carousel posts)
- "What if you invested $10k in 2020" memes
- User-submitted results (with permission)
- Strategy debates (comment engagement)

**Video Content:**
- Product walkthrough (2 min)
- Strategy deep dives (5-10 min each)
- "Worst timing ever" scenarios (entertaining + educational)

### SEO Keywords to Target
- "bitcoin dca strategy"
- "crypto dollar cost averaging"
- "best bitcoin investment strategy"
- "backtest crypto strategy"
- "bitcoin strategy comparison"
- "dca calculator bitcoin"

## Legal & Compliance

### Required Disclaimers

**On every page:**
> "WhatIfCrypto provides educational backtesting tools only. Past performance does not guarantee future results. This is not financial advice. Cryptocurrency investments carry significant risk. Always do your own research and consult with a financial advisor before investing."

**Before results:**
> "These results are based on historical data and do not account for fees, taxes, slippage, or changing market conditions. Actual results may vary significantly."

### Terms of Service Essentials
- No liability for investment losses
- Data accuracy not guaranteed
- Service provided "as-is"
- Right to change or discontinue service
- User must be 18+ to use

### Privacy Policy
- What data we collect (analytics only, no personal info for free tier)
- How we use cookies
- Third-party services (Google Analytics, ad networks)
- GDPR compliance (if targeting EU)

## Success Metrics & KPIs

### User Engagement
- Daily/Monthly Active Users (DAU/MAU)
- Average strategies compared per session
- Return user rate (within 7/30 days)
- Time spent on results page
- Social share rate (download feature usage)

### Business Metrics
- Click-through rate on affiliate links
- Affiliate conversion rate
- Revenue per 1,000 users
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV) - if premium tier exists

### Growth Metrics
- Traffic sources (organic, social, referral)
- Sign-up rate (if email list exists)
- Viral coefficient (shares per user)
- SEO ranking for target keywords

## Risks & Mitigation

### Technical Risks
- **API rate limits:** Use multiple free APIs, implement caching
- **Data accuracy:** Validate against multiple sources
- **Performance:** Optimize calculations, use web workers if needed

### Business Risks
- **Competition:** Focus on simplicity and UX as differentiator
- **Regulation:** Stay educational, clear disclaimers, avoid "advice"
- **Revenue:** Diversify income streams (ads + affiliates + premium)

### Market Risks
- **Crypto bear market:** Tool still useful, but traffic may drop
- **User trust:** Transparent methodology, open about limitations

## Open Questions & Decisions Needed

1. **Domain name:** whatifcrypto.com available? (.io alternative?)
2. **Branding:** Logo, color scheme, visual identity
3. **Initial partnerships:** Which exchange to approach first?
4. **Premium tier:** Yes or no? If yes, what features?
5. **Data provider:** CoinGecko vs CryptoCompare vs others?
6. **Analytics:** Google Analytics vs privacy-focused alternative?
7. **Hosting:** Vercel vs Netlify vs Cloudflare Pages?

## Next Steps

1. **Immediate (This Week):**
   - Validate domain availability and purchase
   - Set up GitHub repository
   - Create project structure with React + TypeScript
   - Test CoinGecko API and data format

2. **Short-term (Next 2 Weeks):**
   - Build strategy calculation engine
   - Implement basic UI (strategy selection)
   - Create results visualization (chart + table)

3. **Medium-term (Next 4 Weeks):**
   - Polish UI/UX
   - Add disclaimers and legal pages
   - Prepare launch materials
   - Beta test with friends/community

---

## Appendix: Strategy Implementation Details

### 1. Lump Sum Strategy
```typescript
// Buy entire amount at start date
totalBTC = investmentAmount / priceAtStart
avgBuyPrice = priceAtStart
```

### 2. Weekly/Monthly DCA
```typescript
// Fixed intervals
buyAmount = totalInvestment / numberOfPeriods
for each period:
  btcPurchased = buyAmount / currentPrice
  totalBTC += btcPurchased
avgBuyPrice = totalInvestment / totalBTC
```

### 3. RSI DCA
```typescript
// Calculate 14-day RSI
rsi = calculateRSI(prices, 14)
if rsi < 30:
  buyAmount = baseDCA * 2  // Buy double
else if rsi > 70:
  buyAmount = 0  // Skip purchase
else:
  buyAmount = baseDCA  // Normal purchase
```

### 4. Dip Buyer DCA
```typescript
// Track recent high (30-day)
recentHigh = max(prices[-30:])
currentPrice = prices[today]
dropPercent = (recentHigh - currentPrice) / recentHigh

if dropPercent > 0.10:  // 10%+ drop
  buyAmount = baseDCA * 2
else:
  buyAmount = baseDCA
```

### 5. Moving Average DCA
```typescript
// 200-day Simple Moving Average
ma200 = average(prices[-200:])
currentPrice = prices[today]

if currentPrice < ma200:
  buyAmount = baseDCA * 2  // Price below MA, buy more
else:
  buyAmount = baseDCA
```

### 6. Combined Smart DCA
```typescript
// Combine multiple signals
multiplier = 1.0

if rsi < 30: multiplier += 0.5
if currentPrice < ma200: multiplier += 0.5
if dropPercent > 0.10: multiplier += 0.5

buyAmount = baseDCA * multiplier
// Cap at 2.5x to prevent over-buying
buyAmount = min(buyAmount, baseDCA * 2.5)
```

### Key Metrics Calculations

**Total Return:**
```typescript
finalValue = totalBTC * currentPrice
totalReturn = (finalValue - totalInvestment) / totalInvestment * 100
```

**Average Buy Price:**
```typescript
avgBuyPrice = totalInvestment / totalBTC
```

**Maximum Drawdown:**
```typescript
// Track peak portfolio value
for each day:
  portfolioValue = totalBTC * priceOnDay
  if portfolioValue > peak:
    peak = portfolioValue
  drawdown = (peak - portfolioValue) / peak * 100
  maxDrawdown = max(maxDrawdown, drawdown)
```

**Sharpe Ratio:**
```typescript
// Simplified version (assumes 0% risk-free rate)
returns = dailyReturns[]
avgReturn = average(returns)
stdDev = standardDeviation(returns)
sharpeRatio = (avgReturn / stdDev) * sqrt(252)  // Annualized
```

---

**Document Version:** 1.0  
**Last Updated:** November 28, 2025  
**Author:** Quyet  
**Project Status:** Planning Phase