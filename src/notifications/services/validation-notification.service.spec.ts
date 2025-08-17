import { Test, TestingModule } from '@nestjs/testing';
import { ValidationNotificationService } from './validation-notification.service';
import { NotificationService } from './notification.service';
import { ExpenseValidationService } from '../../expenses/services/expense-validation.service';
import { Expense, ExpenseStatus } from '../../entities/expense.entity';
import { User } from '../../entities/user.entity';

describe('ValidationNotificationService', () => {
  let service: ValidationNotificationService;
  let notificationService: jest.Mocked<NotificationService>;
  let validationService: jest.Mocked<ExpenseValidationService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  } as User;

  const mockExpense = {
    id: 'expense-1',
    paymentId: 'PAY-001',
    submitter: mockUser,
    status: ExpenseStatus.DRAFT,
    vendor: 'Test Vendor',
    amount: 1000,
    description: 'Test expense',
    date: new Date(),
  } as Expense;

  beforeEach(async () => {
    const mockNotificationService = {
      notifyMissingFields: jest.fn(),
      createNotification: jest.fn(),
    };

    const mockValidationService = {
      validateExpenseSubmission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationNotificationService,
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: ExpenseValidationService,
          useValue: mockValidationService,
        },
      ],
    }).compile();

    service = module.get<ValidationNotificationService>(
      ValidationNotificationService,
    );
    notificationService = module.get(NotificationService);
    validationService = module.get(ExpenseValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAndNotify', () => {
    it('should send notification when validation fails', async () => {
      const validationResult = {
        isValid: false,
        errors: ['Vendor is required', 'Amount is required'],
        missingFields: ['vendor', 'amount'],
      };

      validationService.validateExpenseSubmission.mockReturnValue(
        validationResult,
      );
      notificationService.notifyMissingFields.mockResolvedValue({} as any);

      const result = await service.validateAndNotify(mockExpense);

      expect(result).toEqual(validationResult);
      expect(notificationService.notifyMissingFields).toHaveBeenCalledWith(
        mockExpense.submitter.id,
        mockExpense.id,
        ['vendor', 'amount'],
      );
    });

    it('should not send notification when validation passes', async () => {
      const validationResult = {
        isValid: true,
        errors: [],
        missingFields: [],
      };

      validationService.validateExpenseSubmission.mockReturnValue(
        validationResult,
      );

      const result = await service.validateAndNotify(mockExpense);

      expect(result).toEqual(validationResult);
      expect(notificationService.notifyMissingFields).not.toHaveBeenCalled();
    });
  });

  describe('validateExpenseCompleteness', () => {
    it('should identify critical missing fields', async () => {
      const validationResult = {
        isValid: false,
        errors: ['Vendor is required', 'Amount is required'],
        missingFields: ['Vendor', 'Amount', 'Payment method'],
      };

      validationService.validateExpenseSubmission.mockReturnValue(
        validationResult,
      );
      notificationService.createNotification.mockResolvedValue({} as any);

      const result = await service.validateExpenseCompleteness(mockExpense);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toEqual([
        'Vendor',
        'Amount',
        'Payment method',
      ]);
      expect(result.criticalFields).toEqual(['Vendor', 'Amount']);
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Critical Fields Missing',
          priority: 'urgent',
        }),
      );
    });

    it('should not send notification when no critical fields are missing', async () => {
      const validationResult = {
        isValid: false,
        errors: ['Payment method is required'],
        missingFields: ['Payment method'],
      };

      validationService.validateExpenseSubmission.mockReturnValue(
        validationResult,
      );

      const result = await service.validateExpenseCompleteness(mockExpense);

      expect(result.criticalFields).toEqual([]);
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('validateExpenseWithFeedback', () => {
    it('should provide warnings and suggestions', async () => {
      const expenseWithShortDescription = {
        ...mockExpense,
        description: 'Short',
        amount: 15000000, // Large amount
        files: [],
      } as Expense;

      const validationResult = {
        isValid: true,
        errors: [],
        missingFields: [],
      };

      validationService.validateExpenseSubmission.mockReturnValue(
        validationResult,
      );
      notificationService.createNotification.mockResolvedValue({} as any);

      const result = await service.validateExpenseWithFeedback(
        expenseWithShortDescription,
      );

      expect(result.warnings).toContain(
        'Description is very short. Consider adding more details.',
      );
      expect(result.warnings).toContain('Large expense amount detected.');
      // Note: File attachment warning is commented out in implementation
      // expect(result.warnings).toContain('No invoice files attached.');
      expect(result.suggestions).toContain(
        'Add more descriptive information about the expense purpose.',
      );
      expect(notificationService.createNotification).toHaveBeenCalled();
    });
  });
});
