import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuditContext {
  private static asyncLocalStorage = new AsyncLocalStorage<User>();

  setCurrentUser(user: User): void {
    AuditContext.asyncLocalStorage.enterWith(user);
  }

  getCurrentUser(): User | null {
    return AuditContext.asyncLocalStorage.getStore() || null;
  }

  clearUser(): void {
    AuditContext.asyncLocalStorage.enterWith(undefined as any);
  }
}
