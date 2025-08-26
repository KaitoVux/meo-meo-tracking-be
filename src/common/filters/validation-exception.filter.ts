import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../dto/api-response.dto';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Check if this is a validation error from class-validator
    const validationDetails = this.extractValidationDetails(exceptionResponse);

    // Log the validation error
    this.logger.warn(`Validation Error: ${exception.message}`, {
      path: request.url,
      method: request.method,
      validationDetails,
    });

    // Create standardized validation error response
    const errorResponse = ApiResponse.error(validationDetails.message, {
      code: 'VALIDATION_ERROR',
      details: validationDetails.details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });

    response.status(status).json(errorResponse);
  }

  private extractValidationDetails(exceptionResponse: any): {
    message: string;
    details: any;
  } {
    // Handle class-validator validation errors
    if (
      typeof exceptionResponse === 'object' &&
      Array.isArray(exceptionResponse.message)
    ) {
      return {
        message: 'Validation failed',
        details: {
          errors: this.formatValidationErrors(exceptionResponse.message),
        },
      };
    }

    // Handle custom validation errors with structured format
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse.message &&
      exceptionResponse.errors
    ) {
      return {
        message: exceptionResponse.message,
        details: {
          errors: exceptionResponse.errors,
        },
      };
    }

    // Handle simple string messages
    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse,
        details: {},
      };
    }

    // Handle object with message property
    if (typeof exceptionResponse === 'object' && exceptionResponse.message) {
      return {
        message: exceptionResponse.message,
        details: exceptionResponse.error || exceptionResponse.details || {},
      };
    }

    // Fallback
    return {
      message: 'Validation failed',
      details: exceptionResponse || {},
    };
  }

  private formatValidationErrors(validationErrors: any[]): any[] {
    return validationErrors.map((error) => {
      // Handle string errors (simple validation messages)
      if (typeof error === 'string') {
        return {
          message: error,
        };
      }

      // Handle ValidationError objects from class-validator
      if (typeof error === 'object') {
        return {
          field: error.property || error.field,
          value: error.value,
          constraints: error.constraints || error.messages,
          message:
            this.getFirstConstraintMessage(error.constraints) || error.message,
        };
      }

      return error;
    });
  }

  private getFirstConstraintMessage(
    constraints: Record<string, string> | undefined,
  ): string | undefined {
    if (!constraints) return undefined;

    const constraintKeys = Object.keys(constraints);
    return constraintKeys.length > 0
      ? constraints[constraintKeys[0]]
      : undefined;
  }
}
