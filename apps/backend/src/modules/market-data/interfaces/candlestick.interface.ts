/**
 * Candlestick data structure for market data
 * Supports multiple timeframes: 1h, 4h, 1d, 1w, 1m
 */
export interface Candlestick {
  timestamp: string; // ISO 8601 format
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // Optional for MVP, but included for completeness
  timeframe: '1h' | '4h' | '1d' | '1w' | '1m';
}

export type Timeframe = '1h' | '4h' | '1d' | '1w' | '1m';

