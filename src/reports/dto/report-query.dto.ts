import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsArray,
  IsBoolean,
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
  categories?: string[];

  @IsOptional()
  @IsArray()
  vendors?: string[];

  @IsOptional()
  @IsArray()
  statuses?: ExpenseStatus[];

  @IsOptional()
  @IsBoolean()
  selectAllCategories?: boolean;

  @IsOptional()
  @IsBoolean()
  selectAllVendors?: boolean;

  @IsOptional()
  @IsBoolean()
  selectAllStatuses?: boolean;

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
  @IsBoolean()
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
