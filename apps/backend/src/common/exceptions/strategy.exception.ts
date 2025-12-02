import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Strategy Exception
 * Custom exception for strategy calculation related errors
 */
export class StrategyException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        statusCode,
        message,
        error: 'Strategy Error',
      },
      statusCode,
    );
  }
}
