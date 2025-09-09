import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  IsUrl,
  Min,
} from 'class-validator';
import {
  Currency,
  PaymentMethod,
  ExpenseType,
} from '../../entities/expense.entity';
import { Transform } from 'class-transformer';

export class CreateExpenseDto {
  @IsDateString()
  @IsNotEmpty()
  transactionDate!: string;

  @IsString()
  @IsNotEmpty()
  expenseMonth!: string;

  @IsUUID()
  @IsNotEmpty()
  vendorId!: string;

  @IsUUID()
  @IsNotEmpty()
  category!: string;

  @IsEnum(ExpenseType)
  type: ExpenseType = ExpenseType.OUT;

  @IsNumber()
  @Min(0)
  amountBeforeVAT!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => (value === null ? null : value))
  vatPercentage?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vatAmount?: number;

  @IsNumber()
  @Min(0)
  amount!: number; // Amount after VAT

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

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Invoice link must be a valid URL' })
  invoiceLink?: string;
}
