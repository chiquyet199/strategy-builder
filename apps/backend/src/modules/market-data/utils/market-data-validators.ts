/**
 * Pure functions for market data validation
 * These functions have no side effects and are easily testable
 */

/**
 * Validate if a symbol is supported
 * @param symbol - Symbol to validate (e.g., "BTC/USD")
 * @param supportedSymbols - Array of supported symbols
 * @throws Error if symbol is not supported
 */
export function validateSymbol(
  symbol: string,
  supportedSymbols: string[],
): void {
  if (!supportedSymbols.includes(symbol)) {
    throw new Error(
      `Symbol ${symbol} is not supported. Supported symbols: ${supportedSymbols.join(', ')}`,
    );
  }
}

/**
 * Validate date range
 * @param startDate - Start date
 * @param endDate - End date
 * @param maxDate - Maximum allowed date (optional)
 * @throws Error if validation fails
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date,
  maxDate?: Date,
): void {
  if (startDate > endDate) {
    throw new Error('Start date must be before end date');
  }

  if (maxDate && endDate > maxDate) {
    throw new Error(`End date cannot be beyond ${maxDate.toISOString().split('T')[0]}`);
  }
}

/**
 * Parse supported symbols from environment variable
 * @param envValue - Environment variable value (comma-separated)
 * @param defaultValue - Default value if env is not set
 * @returns Array of supported symbols
 */
export function parseSupportedSymbols(
  envValue: string | undefined,
  defaultValue: string = 'BTC/USD',
): string[] {
  const symbolsEnv = envValue || defaultValue;
  return symbolsEnv.split(',').map((s) => s.trim());
}

