import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ExpenseValidationService } from './expense-validation.service';
import { CreateExpenseDto, UpdateExpenseDto } from '../dto';
import {
  Expense,
  Currency,
  PaymentMethod,
  ExpenseStatus,
} from '../../entities/expense.entity';

describe('ExpenseValidationService', () => {
  let service: ExpenseValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpenseValidationService],
    }).compile();

    service = module.get<ExpenseValidationService>(ExpenseValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateExpenseCreation', () => {
    it('should pass validation with valid expense data', () => {
      const dto: CreateExpenseDto = {
        date: '2024-01-15',
        vendor: 'Test Vendor',
        category: 'Office Supplies',
        amount: 100.5,
        currency: Currency.VND,
        description: 'Test expense description',
        submitterId: 'user-123',
        paymentMethod: PaymentMethod.CASH,
      };

      const result = service.validateExpenseCreation(dto);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should fail validation with missing required fields', () => {
      const dto: CreateExpenseDto = {
        date: '',
        vendor: '',
        category: '',
        amount: 0,
        currency: Currency.VND,
        description: '',
        submitterId: '',
        paymentMethod: PaymentMethod.CASH,
      };

      const result = service.validateExpenseCreation(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.missingFields).toContain('Date');
      expect(result.missingFields).toContain('Vendor');
      expect(result.missingFields).toContain('Category');
      expect(result.missingFields).toContain('Amount');
      expect(result.missingFields).toContain('Description');
      expect(result.missingFields).toContain('Submitter');
    });

    it('should require exchange rate for USD currency', () => {
      const dto: CreateExpenseDto = {
        date: '2024-01-15',
        vendor: 'Test Vendor',
        category: 'Office Supplies',
        amount: 100.5,
        currency: Currency.USD,
        description: 'Test expense description',
        submitterId: 'user-123',
        paymentMethod: PaymentMethod.CASH,
      };

      const result = service.validateExpenseCreation(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Exchange rate is required for USD currency',
      );
    });

    it('should validate date format', () => {
      const dto: CreateExpenseDto = {
        date: 'invalid-date',
        vendor: 'Test Vendor',
        category: 'Office Supplies',
        amount: 100.5,
        currency: Currency.VND,
        description: 'Test expense description',
        submitterId: 'user-123',
        paymentMethod: PaymentMethod.CASH,
      };

      const result = service.validateExpenseCreation(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid date format');
    });

    it('should validate positive amount', () => {
      const dto: CreateExpenseDto = {
        date: '2024-01-15',
        vendor: 'Test Vendor',
        category: 'Office Supplies',
        amount: -50,
        currency: Currency.VND,
        description: 'Test expense description',
        submitterId: 'user-123',
        paymentMethod: PaymentMethod.CASH,
      };

      const result = service.validateExpenseCreation(dto);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be greater than 0');
    });
  });

  describe('validateExpenseUpdate', () => {
    let existingExpense: Expense;

    beforeEach(() => {
      existingExpense = new Expense();
      existingExpense.id = 'expense-123';
      existingExpense.amount = 100;
      existingExpense.currency = Currency.VND;
      existingExpense.exchangeRate = undefined;
    });

    it('should pass validation with valid update data', () => {
      const dto: UpdateExpenseDto = {
        amount: 150,
        description: 'Updated description',
      };

      const result = service.validateExpenseUpdate(dto, existingExpense);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate positive amount in updates', () => {
      const dto: UpdateExpenseDto = {
        amount: -50,
      };

      const result = service.validateExpenseUpdate(dto, existingExpense);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount must be greater than 0');
    });

    it('should require exchange rate when updating to USD', () => {
      const dto: UpdateExpenseDto = {
        currency: Currency.USD,
      };

      const result = service.validateExpenseUpdate(dto, existingExpense);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Exchange rate is required for USD currency',
      );
    });
  });

  describe('validateExpenseSubmission', () => {
    let expense: Expense;

    beforeEach(() => {
      expense = new Expense();
      expense.id = 'expense-123';
      expense.date = new Date();
      expense.vendor = 'Test Vendor';
      expense.amount = 100;
      expense.description = 'Test description';
      expense.paymentMethod = PaymentMethod.CASH;
    });

    it('should pass validation for complete expense', () => {
      const result = service.validateExpenseSubmission(expense);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should fail validation for incomplete expense', () => {
      expense.vendor = '';
      expense.amount = 0;
      expense.description = '';

      const result = service.validateExpenseSubmission(expense);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('Vendor');
      expect(result.missingFields).toContain('Amount');
      expect(result.missingFields).toContain('Description');
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw for valid validation result', () => {
      const validResult = {
        isValid: true,
        errors: [],
        missingFields: [],
      };

      expect(() => service.validateOrThrow(validResult)).not.toThrow();
    });

    it('should throw BadRequestException for invalid validation result', () => {
      const invalidResult = {
        isValid: false,
        errors: ['Test error'],
        missingFields: ['Test field'],
      };

      expect(() => service.validateOrThrow(invalidResult)).toThrow(
        BadRequestException,
      );
    });
  });
});
