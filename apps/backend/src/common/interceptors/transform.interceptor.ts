import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  message?: string;
  meta?: Record<string, any>;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data already has a wrapper structure, return as is
        if (data && typeof data === 'object' && 'data' in data) {
          return data;
        }
        
        // Wrap response in standard format
        return {
          data,
          message: context.switchToHttp().getResponse().statusMessage || 'Success',
        };
      }),
    );
  }
}

