import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { User } from '../../entities/user.entity';
import { AuditContext } from '../services/audit-context.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditContext: AuditContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user; // User attached by auth guard

    // Set the current user in the audit context
    if (user) {
      this.auditContext.setCurrentUser(user);
    }

    return next.handle().pipe(
      finalize(() => {
        // Clear the user context after the request is complete
        this.auditContext.clearUser();
      }),
    );
  }
}
