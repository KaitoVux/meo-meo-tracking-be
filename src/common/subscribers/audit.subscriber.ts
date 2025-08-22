import {
  EventSubscriber,
  FlushEventArgs,
  EntityManager,
} from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { BaseEntity } from '../../entities/base.entity';
import { User } from '../../entities/user.entity';
import { AuditContext } from '../services/audit-context.service';

@Injectable()
export class AuditSubscriber implements EventSubscriber {
  constructor(private readonly auditContext: AuditContext) {}

  async onFlush(args: FlushEventArgs): Promise<void> {
    const currentUser = this.auditContext.getCurrentUser();
    
    if (!currentUser) {
      // No user context available (e.g., system operations, migrations, seeders)
      return;
    }

    const changeSets = args.uow.getChangeSets();

    for (const changeSet of changeSets) {
      const entity = changeSet.entity;

      if (!(entity instanceof BaseEntity)) {
        continue;
      }

      switch (changeSet.type) {
        case 'create':
          entity.createdBy = currentUser;
          entity.updatedBy = currentUser;
          break;
        case 'update':
          entity.updatedBy = currentUser;
          
          // Handle soft deletes - if deletedAt was set and deletedBy is not set
          if (entity.deletedAt && !entity.deletedBy) {
            entity.deletedBy = currentUser;
          }
          break;
        // Note: Hard deletes don't need audit tracking since the record is removed
      }
    }
  }
}
