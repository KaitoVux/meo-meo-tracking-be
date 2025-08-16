import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';
import { Currency, PaymentMethod } from '../../entities/expense.entity';

export class CreateExpenseDto {
  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsNotEmpty()
  vendor!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsEnum(Currency)
  currency: Currency = Currency.VND;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsUUID()
  @IsNotEmpty()
  submitterId!: string;

  @IsOptional()
  @IsString()
  projectCostCenter?: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsUUID()
  invoiceFileId?: string;
}
