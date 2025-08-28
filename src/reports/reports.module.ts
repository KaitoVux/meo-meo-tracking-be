import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ReportsController } from './reports.controller';
import { DashboardService } from './services/dashboard.service';
import { ReportGenerationService } from './services/report-generation.service';
import { ExportService } from './services/export.service';
import { PaymentDueService } from './services/payment-due.service';
import { Expense } from '../entities/expense.entity';
import { User } from '../entities/user.entity';
import { Vendor } from '../entities/vendor.entity';
import { Category } from '../entities/category.entity';
import { ExpenseStatusHistory } from '../entities/expense-status-history.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Expense,
      User,
      Vendor,
      Category,
      ExpenseStatusHistory,
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    DashboardService,
    ReportGenerationService,
    ExportService,
    PaymentDueService,
  ],
  exports: [
    DashboardService,
    ReportGenerationService,
    ExportService,
    PaymentDueService,
  ],
})
export class ReportsModule {}
