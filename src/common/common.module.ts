import { Module, Global, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { AuditContext } from './services/audit-context.service';
import { AuditSubscriber } from './subscribers/audit.subscriber';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Global()
@Module({
  providers: [AuditContext, AuditSubscriber, AuditInterceptor],
  exports: [AuditContext, AuditSubscriber, AuditInterceptor],
})
export class CommonModule implements OnModuleInit {
  constructor(
    private readonly em: EntityManager,
    private readonly auditSubscriber: AuditSubscriber,
  ) {}

  onModuleInit() {
    // Register the audit subscriber with MikroORM
    this.em.getEventManager().registerSubscriber(this.auditSubscriber);
  }
}
