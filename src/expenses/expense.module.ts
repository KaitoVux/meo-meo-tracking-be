import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './services/expense.service';
import { ExpenseValidationService } from './services/expense-validation.service';
import { PaymentIdService } from './services/payment-id.service';
import { ExpenseWorkflowService } from './services/expense-workflow.service';
import { Expense } from '../entities/expense.entity';
import { ExpenseStatusHistory } from '../entities/expense-status-history.entity';
import { User } from '../entities/user.entity';
import { File } from '../entities/file.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([Expense, ExpenseStatusHistory, User, File]),
  ],
  controllers: [ExpenseController],
  providers: [
    ExpenseService,
    ExpenseValidationService,
    PaymentIdService,
    ExpenseWorkflowService,
  ],
  exports: [
    ExpenseService,
    ExpenseValidationService,
    PaymentIdService,
    ExpenseWorkflowService,
  ],
})
export class ExpenseModule {}
