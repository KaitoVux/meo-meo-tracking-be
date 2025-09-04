import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  PaymentMethod,
  ExpenseType,
  ExpenseStatus,
} from '../../entities/expense.entity';
import { User } from '../../entities/user.entity';
import { Vendor } from '../../entities/vendor.entity';
import { Category } from '../../entities/category.entity';
import { File } from '../../entities/file.entity';
import { ExpenseStatusHistory } from '../../entities/expense-status-history.entity';

export class ExpenseResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the expense',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id!: string;

  @ApiProperty({
    description: 'Generated payment ID for the expense',
    example: 'PAY-2024-001',
  })
  paymentId!: string;

  @ApiPropertyOptional({
    description: 'Sub ID for grouped expenses',
    example: 'A',
  })
  subId?: string;

  @ApiProperty({
    description: 'Date when the transaction occurred',
    example: '2024-08-29T00:00:00.000Z',
  })
  transactionDate!: Date;

  @ApiProperty({
    description: 'Month of the expense (e.g., "September" or "2024-09")',
    example: 'September',
  })
  expenseMonth!: string;

  @ApiProperty({
    description: 'Category name (legacy field for backward compatibility)',
    example: 'Office Supplies',
  })
  category!: string;

  @ApiProperty({
    enum: ExpenseType,
    description: 'Type of expense (IN for income, OUT for expense)',
    example: ExpenseType.OUT,
  })
  type!: ExpenseType;

  @ApiProperty({
    description: 'Amount before VAT is applied',
    example: 100.0,
    type: 'number',
    format: 'decimal',
  })
  amountBeforeVAT!: number;

  @ApiPropertyOptional({
    description: 'VAT percentage applied to the expense',
    example: 10.0,
    type: 'number',
    format: 'decimal',
  })
  vatPercentage?: number;

  @ApiPropertyOptional({
    description: 'VAT amount calculated from percentage',
    example: 10.0,
    type: 'number',
    format: 'decimal',
  })
  vatAmount?: number;

  @ApiProperty({
    description: 'Total amount after VAT',
    example: 110.0,
    type: 'number',
    format: 'decimal',
  })
  amount!: number;

  @ApiProperty({
    enum: Currency,
    description: 'Currency of the expense',
    example: Currency.VND,
  })
  currency!: Currency;

  @ApiPropertyOptional({
    description: 'Exchange rate if currency conversion is needed',
    example: 24000.0,
    type: 'number',
    format: 'decimal',
  })
  exchangeRate?: number;

  @ApiProperty({
    description: 'Description of the expense',
    example: 'Office supplies for Q3 2024',
  })
  description!: string;

  @ApiPropertyOptional({
    description: 'Project or cost center for expense allocation',
    example: 'PROJECT-2024-001',
  })
  projectCostCenter?: string;

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Method used for payment',
    example: PaymentMethod.BANK_TRANSFER,
  })
  paymentMethod!: PaymentMethod;

  @ApiProperty({
    enum: ExpenseStatus,
    description: 'Current status of the expense in the workflow',
    example: ExpenseStatus.IN_PROGRESS,
  })
  status!: ExpenseStatus;

  // Foreign key IDs for easier frontend consumption
  @ApiProperty({
    description: 'ID of the user who submitted the expense',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  submitterId!: string;

  @ApiProperty({
    description: 'ID of the vendor associated with the expense',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  })
  vendorId!: string;

  @ApiPropertyOptional({
    description: 'ID of the category entity (new structure)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d481',
  })
  categoryEntityId?: string;

  @ApiPropertyOptional({
    description: 'ID of the uploaded invoice file',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d482',
  })
  invoiceFileId?: string;

  // Audit fields
  @ApiProperty({
    description: 'Timestamp when the expense was created',
    example: '2024-08-29T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Timestamp when the expense was last updated',
    example: '2024-08-29T15:45:00.000Z',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when the expense was soft deleted',
    example: '2024-08-30T09:15:00.000Z',
  })
  deletedAt?: Date;

  @ApiPropertyOptional({
    description: 'ID of the user who created the expense',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  createdById?: string;

  @ApiPropertyOptional({
    description: 'ID of the user who last updated the expense',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  updatedById?: string;

  @ApiPropertyOptional({
    description: 'ID of the user who deleted the expense',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  deletedById?: string;

  // Populated relations (optional, included when requested)
  @ApiPropertyOptional({
    type: () => User,
    description: 'Submitter details (populated when requested)',
  })
  submitter?: User;

  @ApiPropertyOptional({
    type: () => Vendor,
    description: 'Vendor details (populated when requested)',
  })
  vendor?: Vendor;

  @ApiPropertyOptional({
    type: () => Category,
    description: 'Category details (populated when requested)',
  })
  categoryEntity?: Category;

  @ApiPropertyOptional({
    type: () => File,
    description: 'Invoice file details (populated when requested)',
  })
  invoiceFile?: File;

  @ApiPropertyOptional({
    type: () => [ExpenseStatusHistory],
    description: 'Status change history (populated when requested)',
  })
  statusHistory?: ExpenseStatusHistory[];

  // Helper method to create response DTO from entity
  static fromEntity(expense: any): ExpenseResponseDto {
    const dto = new ExpenseResponseDto();

    // Basic fields
    dto.id = expense.id;
    dto.paymentId = expense.paymentId;
    dto.subId = expense.subId;
    dto.transactionDate = expense.transactionDate;
    dto.expenseMonth = expense.expenseMonth;
    dto.category = expense.category;
    dto.type = expense.type;
    dto.amountBeforeVAT = expense.amountBeforeVAT;
    dto.vatPercentage = expense.vatPercentage;
    dto.vatAmount = expense.vatAmount;
    dto.amount = expense.amount;
    dto.currency = expense.currency;
    dto.exchangeRate = expense.exchangeRate;
    dto.description = expense.description;
    dto.projectCostCenter = expense.projectCostCenter;
    dto.paymentMethod = expense.paymentMethod;
    dto.status = expense.status;

    // Foreign key IDs
    dto.submitterId = expense.submitter?.id || expense.submitter;
    dto.vendorId = expense.vendor?.id || expense.vendor;
    dto.categoryEntityId = expense.categoryEntity?.id || expense.categoryEntity;
    dto.invoiceFileId = expense.invoiceFile?.id || expense.invoiceFile;

    // Audit fields
    dto.createdAt = expense.createdAt;
    dto.updatedAt = expense.updatedAt;
    dto.deletedAt = expense.deletedAt;
    dto.createdById = expense.createdBy?.id || expense.createdBy;
    dto.updatedById = expense.updatedBy?.id || expense.updatedBy;
    dto.deletedById = expense.deletedBy?.id || expense.deletedBy;

    // Populated relations (if available)
    if (expense.submitter && typeof expense.submitter === 'object') {
      dto.submitter = expense.submitter;
    }
    if (expense.vendor && typeof expense.vendor === 'object') {
      dto.vendor = expense.vendor;
    }
    if (expense.categoryEntity && typeof expense.categoryEntity === 'object') {
      dto.categoryEntity = expense.categoryEntity;
    }
    if (expense.invoiceFile && typeof expense.invoiceFile === 'object') {
      dto.invoiceFile = expense.invoiceFile;
    }
    if (expense.statusHistory) {
      dto.statusHistory = expense.statusHistory;
    }

    return dto;
  }
}
