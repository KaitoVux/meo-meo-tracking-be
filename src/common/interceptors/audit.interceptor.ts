import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { User } from '../../entities/user.entity';
import { AuditContext } from '../services/audit-context.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditContext: AuditContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user; // User attached by auth guard

    // Set the current user in the audit context
    if (user) {
      this.auditContext.setCurrentUser(user);
    }

    return next.handle();
  }
}
