/**
 * Pure functions for market data sync operations
 * These functions have no side effects and are easily testable
 */

/**
 * Parse supported symbols from environment variable
 * @param envValue - Environment variable value (comma-separated)
 * @param defaultValue - Default value if env is not set
 * @returns Array of supported symbols
 */
export function parseSupportedSymbolsFromEnv(
  envValue: string | undefined,
  defaultValue: string = 'BTC/USD',
): string[] {
  const symbolsEnv = envValue || defaultValue;
  return symbolsEnv.split(',').map((s) => s.trim());
}

/**
 * Calculate gap date ranges for data synchronization
 * @param existingCandles - Array of existing candle timestamps
 * @param startDate - Desired start date
 * @param endDate - Desired end date
 * @returns Array of gap ranges to fill: [{ start, end }, ...]
 */
export function calculateGapRanges(
  existingCandles: Date[],
  startDate: Date,
  endDate: Date,
): Array<{ start: Date; end: Date }> {
  const gaps: Array<{ start: Date; end: Date }> = [];

  if (existingCandles.length === 0) {
    // No data exists, sync the entire range
    return [{ start: startDate, end: endDate }];
  }

  const sortedCandles = [...existingCandles].sort(
    (a, b) => a.getTime() - b.getTime(),
  );
  const earliest = sortedCandles[0];
  const latest = sortedCandles[sortedCandles.length - 1];

  // Check if we need to sync before earliest
  if (earliest > startDate) {
    gaps.push({ start: startDate, end: earliest });
  }

  // Check if we need to sync after latest
  if (latest < endDate) {
    gaps.push({ start: latest, end: endDate });
  }

  return gaps;
}
