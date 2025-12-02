import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Market Data Exception
 * Custom exception for market data related errors
 */
export class MarketDataException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        statusCode,
        message,
        error: 'Market Data Error',
      },
      statusCode,
    );
  }
}
