import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  Currency,
  ExpenseStatus,
  PaymentMethod,
} from '../../entities/expense.entity';

export class ReportQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  vendors?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(ExpenseStatus, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  statuses?: ExpenseStatus[];

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  submitterId?: string;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  expenseMonth?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeDeleted?: boolean;

  @IsOptional()
  @IsString()
  groupBy?: 'month' | 'category' | 'vendor' | 'status' | 'submitter';

  @IsOptional()
  @IsString()
  sortBy?: 'date' | 'amount' | 'category' | 'vendor' | 'status';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
