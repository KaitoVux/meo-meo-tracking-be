import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the response is already in the correct format, return as is
        if (this.isApiResponse(data)) {
          return data;
        }

        // If it's a raw response, wrap it in the standard format
        return ApiResponse.success(data);
      }),
    );
  }

  private isApiResponse(data: unknown): data is ApiResponse<unknown> {
    return (
      data &&
      typeof data === 'object' &&
      typeof (data as Record<string, unknown>).success === 'boolean' &&
      (Object.prototype.hasOwnProperty.call(data, 'data') ||
        Object.prototype.hasOwnProperty.call(data, 'message') ||
        Object.prototype.hasOwnProperty.call(data, 'error'))
    );
  }
}
