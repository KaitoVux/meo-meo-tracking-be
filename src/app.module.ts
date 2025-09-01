import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ExpenseModule } from './expenses/expense.module';
import { FilesModule } from './files/files.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CategoryModule } from './categories/category.module';
import { VendorModule } from './vendors/vendor.module';
import { ReportsModule } from './reports/reports.module';
import { CommonModule } from './common/common.module';

import config from './mikro-orm.config';

@Module({
  imports: [
    MikroOrmModule.forRoot(config),
    CommonModule,
    AuthModule,
    ExpenseModule,
    FilesModule,
    NotificationsModule,
    CategoryModule,
    VendorModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
