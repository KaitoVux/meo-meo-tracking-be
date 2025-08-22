import { Injectable, Scope } from '@nestjs/common';
import { User } from '../../entities/user.entity';

@Injectable({ scope: Scope.REQUEST })
export class AuditContext {
  private currentUser: User | null = null;

  setCurrentUser(user: User): void {
    this.currentUser = user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  clearUser(): void {
    this.currentUser = null;
  }
}
