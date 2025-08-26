import { Module, Global, OnModuleInit } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { EntityManager } from '@mikro-orm/core';
import { AuditContext } from './services/audit-context.service';
import { AuditSubscriber } from './subscribers/audit.subscriber';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import {
  HttpExceptionFilter,
  GlobalExceptionFilter,
  ValidationExceptionFilter,
} from './filters';

@Global()
@Module({
  providers: [
    AuditContext,
    AuditSubscriber,
    AuditInterceptor,
    ResponseInterceptor,
    HttpExceptionFilter,
    GlobalExceptionFilter,
    ValidationExceptionFilter,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [
    AuditContext,
    AuditSubscriber,
    AuditInterceptor,
    ResponseInterceptor,
    HttpExceptionFilter,
    GlobalExceptionFilter,
    ValidationExceptionFilter,
  ],
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
