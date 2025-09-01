import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateExpenseDto, UpdateExpenseDto } from '../dto';
import { Expense, Currency } from '../../entities/expense.entity';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  missingFields: string[];
}

@Injectable()
export class ExpenseValidationService {
  /**
   * Validates expense data for creation
   */
  validateExpenseCreation(dto: CreateExpenseDto): ValidationResult {
    const errors: string[] = [];
    const missingFields: string[] = [];

    // Check mandatory fields as per requirements 1.1
    if (!dto.transactionDate) {
      missingFields.push('Transaction Date');
      errors.push('Transaction date is required');
    }

    if (!dto.vendorId) {
      missingFields.push('Vendor');
      errors.push('Vendor is required');
    }

    if (!dto.category) {
      missingFields.push('Category');
      errors.push('Category is required');
    }

    if (dto.amount === undefined || dto.amount === null || dto.amount === 0) {
      missingFields.push('Amount');
      errors.push('Amount is required');
    } else if (dto.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!dto.description) {
      missingFields.push('Description');
      errors.push('Description is required');
    }

    if (!dto.submitterId) {
      missingFields.push('Submitter');
      errors.push('Submitter is required');
    }

    if (!dto.paymentMethod) {
      missingFields.push('Payment method');
      errors.push('Payment method is required');
    }

    // Validate currency and exchange rate logic (requirement 1.2)
    if (dto.currency === Currency.USD && !dto.exchangeRate) {
      errors.push('Exchange rate is required for USD currency');
    }

    // Validate transaction date format
    if (dto.transactionDate) {
      const date = new Date(dto.transactionDate);
      if (isNaN(date.getTime())) {
        errors.push('Invalid transaction date format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      missingFields,
    };
  }

  /**
   * Validates expense data for updates
   */
  validateExpenseUpdate(
    dto: UpdateExpenseDto,
    existingExpense: Expense,
  ): ValidationResult {
    const errors: string[] = [];
    const missingFields: string[] = [];

    // Only validate fields that are being updated
    if (dto.amount !== undefined && dto.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    // Only require exchange rate when currency is being set to USD and no existing rate
    if (
      dto.currency === Currency.USD &&
      dto.exchangeRate === undefined &&
      !existingExpense.exchangeRate
    ) {
      errors.push('Exchange rate is required when setting currency to USD');
    }

    if (dto.transactionDate) {
      const date = new Date(dto.transactionDate);
      if (isNaN(date.getTime())) {
        errors.push('Invalid transaction date format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      missingFields,
    };
  }

  /**
   * Validates if expense can be submitted (all required fields present)
   */
  validateExpenseSubmission(expense: Expense): ValidationResult {
    const errors: string[] = [];
    const missingFields: string[] = [];

    // Check all mandatory fields for submission
    if (!expense.transactionDate) {
      missingFields.push('Transaction Date');
    }

    if (!expense.vendor) {
      missingFields.push('Vendor');
    }

    if (!expense.amount || expense.amount <= 0) {
      missingFields.push('Amount');
    }

    if (!expense.description) {
      missingFields.push('Description');
    }

    if (!expense.paymentMethod) {
      missingFields.push('Payment method');
    }

    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      missingFields,
    };
  }

  /**
   * Throws BadRequestException if validation fails
   */
  validateOrThrow(validationResult: ValidationResult): void {
    if (!validationResult.isValid) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validationResult.errors,
        missingFields: validationResult.missingFields,
      });
    }
  }
}
