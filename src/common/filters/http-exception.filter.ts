import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../dto/api-response.dto';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract error details
    const errorDetails = this.extractErrorDetails(exceptionResponse);

    // Log the error
    this.logger.error(`HTTP Exception: ${exception.message}`, {
      status,
      path: request.url,
      method: request.method,
      errorDetails,
      stack: exception.stack,
    });

    // Create standardized error response
    const errorResponse = ApiResponse.error(
      errorDetails.message || exception.message,
      {
        code: this.getErrorCode(status),
        details: errorDetails.details,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    );

    response.status(status).json(errorResponse);
  }

  private extractErrorDetails(exceptionResponse: any): {
    message: string;
    details?: any;
  } {
    if (typeof exceptionResponse === 'string') {
      return { message: exceptionResponse };
    }

    if (typeof exceptionResponse === 'object') {
      return {
        message: exceptionResponse.message || 'An error occurred',
        details:
          exceptionResponse.error ||
          exceptionResponse.details ||
          exceptionResponse,
      };
    }

    return { message: 'An error occurred' };
  }

  private getErrorCode(status: number): string {
    const errorCodes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
    };

    return errorCodes[status] || 'UNKNOWN_ERROR';
  }
}
