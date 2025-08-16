import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsNumberString,
} from 'class-validator';
import {
  ExpenseStatus,
  Currency,
  PaymentMethod,
} from '../../entities/expense.entity';

export class ExpenseQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  limit?: string = '100';

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  submitterId?: string;

  @IsOptional()
  @IsString()
  paymentId?: string;
}
