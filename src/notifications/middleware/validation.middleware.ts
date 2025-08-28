import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ValidationNotificationService } from '../services/validation-notification.service';

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  constructor(
    private readonly validationNotificationService: ValidationNotificationService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Add validation context to request for expense operations
    if (
      req.method === 'POST' ||
      req.method === 'PUT' ||
      req.method === 'PATCH'
    ) {
      if (req.url.includes('/expenses')) {
        // Store original response.json to intercept responses
        const originalJson = res.json;

        res.json = function (body: any) {
          // If this is an expense creation/update response, trigger validation
          if (body && body.id && req.body) {
            // Async validation notification (don't block response)
            setImmediate(() => {
              try {
                // This would need access to the expense entity
                // In a real implementation, you'd pass the expense object
                console.log(
                  'Validation middleware triggered for expense:',
                  body.id,
                );
              } catch (error) {
                console.error('Validation middleware error:', error);
              }
            });
          }

          return originalJson.call(this, body);
        };
      }
    }

    next();
  }
}
