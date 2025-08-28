import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../dto/api-response.dto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and error details
    const { status, message, details } = this.getErrorInfo(exception);

    // Log the error
    this.logger.error(`Global Exception: ${message}`, {
      status,
      path: request.url,
      method: request.method,
      exception: exception.name || 'Unknown',
      stack: exception.stack,
      details,
    });

    // Create standardized error response
    const errorResponse = ApiResponse.error(message, {
      code: this.getErrorCode(status, exception),
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });

    response.status(status).json(errorResponse);
  }

  private getErrorInfo(exception: any): {
    status: number;
    message: string;
    details?: any;
  } {
    // Handle database/ORM errors
    if (this.isDatabaseError(exception)) {
      return this.handleDatabaseError(exception);
    }

    // Handle validation errors
    if (this.isValidationError(exception)) {
      return this.handleValidationError(exception);
    }

    // Handle JWT errors
    if (this.isJwtError(exception)) {
      return this.handleJwtError(exception);
    }

    // Default to internal server error
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error occurred',
      details:
        process.env.NODE_ENV === 'development'
          ? {
              name: exception.name,
              message: exception.message,
              stack: exception.stack,
            }
          : undefined,
    };
  }

  private isDatabaseError(exception: any): boolean {
    return (
      exception.name?.includes('Database') ||
      exception.name?.includes('Query') ||
      exception.code?.startsWith('ER_') ||
      exception.code?.startsWith('23') // PostgreSQL constraint violations
    );
  }

  private isValidationError(exception: any): boolean {
    return (
      exception.name === 'ValidationError' ||
      exception.name === 'ValidatorError' ||
      Array.isArray(exception.errors)
    );
  }

  private isJwtError(exception: any): boolean {
    return (
      exception.name === 'JsonWebTokenError' ||
      exception.name === 'TokenExpiredError' ||
      exception.name === 'NotBeforeError'
    );
  }

  private handleDatabaseError(exception: any): {
    status: number;
    message: string;
    details?: any;
  } {
    // Handle unique constraint violations
    if (exception.code === '23505' || exception.code === 'ER_DUP_ENTRY') {
      return {
        status: HttpStatus.CONFLICT,
        message: 'Resource already exists',
        details: { constraint: exception.constraint || exception.detail },
      };
    }

    // Handle foreign key violations
    if (
      exception.code === '23503' ||
      exception.code === 'ER_NO_REFERENCED_ROW'
    ) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Referenced resource does not exist',
        details: { constraint: exception.constraint || exception.detail },
      };
    }

    // Handle not null violations
    if (exception.code === '23502' || exception.code === 'ER_BAD_NULL_ERROR') {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Required field is missing',
        details: { field: exception.column },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database operation failed',
      details:
        process.env.NODE_ENV === 'development'
          ? {
              code: exception.code,
              detail: exception.detail,
            }
          : undefined,
    };
  }

  private handleValidationError(exception: any): {
    status: number;
    message: string;
    details?: any;
  } {
    return {
      status: HttpStatus.BAD_REQUEST,
      message: 'Validation failed',
      details: {
        errors: Array.isArray(exception.errors)
          ? exception.errors.map((err: any) => ({
              field: err.property || err.path,
              message: err.message || err.constraints,
            }))
          : exception.message,
      },
    };
  }

  private handleJwtError(exception: any): {
    status: number;
    message: string;
    details?: any;
  } {
    const jwtErrorMessages: Record<string, string> = {
      JsonWebTokenError: 'Invalid token',
      TokenExpiredError: 'Token has expired',
      NotBeforeError: 'Token not active yet',
    };

    return {
      status: HttpStatus.UNAUTHORIZED,
      message: jwtErrorMessages[exception.name] || 'Authentication failed',
      details: { type: exception.name },
    };
  }

  private getErrorCode(status: number, exception: any): string {
    // Database errors
    if (this.isDatabaseError(exception)) {
      if (exception.code === '23505' || exception.code === 'ER_DUP_ENTRY') {
        return 'DUPLICATE_RESOURCE';
      }
      if (
        exception.code === '23503' ||
        exception.code === 'ER_NO_REFERENCED_ROW'
      ) {
        return 'INVALID_REFERENCE';
      }
      if (
        exception.code === '23502' ||
        exception.code === 'ER_BAD_NULL_ERROR'
      ) {
        return 'MISSING_REQUIRED_FIELD';
      }
      return 'DATABASE_ERROR';
    }

    // Validation errors
    if (this.isValidationError(exception)) {
      return 'VALIDATION_ERROR';
    }

    // JWT errors
    if (this.isJwtError(exception)) {
      return 'AUTHENTICATION_ERROR';
    }

    // Default error codes based on status
    const statusErrorCodes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
    };

    return statusErrorCodes[status] || 'UNKNOWN_ERROR';
  }
}
