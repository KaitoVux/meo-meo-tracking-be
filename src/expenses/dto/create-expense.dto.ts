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
import {
  Currency,
  PaymentMethod,
  ExpenseType,
} from '../../entities/expense.entity';

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
  vatPercentage?: number;

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
}
