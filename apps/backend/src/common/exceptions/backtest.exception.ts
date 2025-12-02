import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Backtest Exception
 * Custom exception for backtest related errors
 */
export class BacktestException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        statusCode,
        message,
        error: 'Backtest Error',
      },
      statusCode,
    );
  }
}
