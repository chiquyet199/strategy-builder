import { Candlestick } from '../entities/candlestick.entity';
import { Candlestick as CandlestickInterface } from '../interfaces/candlestick.interface';

/**
 * Pure function to convert database entities to interface format
 * @param entities - Array of Candlestick entities from database
 * @returns Array of Candlestick interfaces
 */
export function convertEntitiesToInterface(
  entities: Candlestick[],
): CandlestickInterface[] {
  return entities.map((entity) => ({
    timestamp: entity.timestamp.toISOString(),
    open: Number(entity.open),
    high: Number(entity.high),
    low: Number(entity.low),
    close: Number(entity.close),
    volume: Number(entity.volume),
    timeframe: entity.timeframe,
  }));
}

