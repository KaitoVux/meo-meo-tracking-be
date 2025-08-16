import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ExpenseStatus } from '../../entities/expense.entity';

export class UpdateExpenseStatusDto {
  @IsEnum(ExpenseStatus)
  status!: ExpenseStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
