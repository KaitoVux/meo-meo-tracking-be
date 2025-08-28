import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ExpenseWorkflowService } from './expense-workflow.service';
import {
  Expense,
  ExpenseStatus,
  PaymentMethod,
} from '../../entities/expense.entity';
import { User } from '../../entities/user.entity';
import { ExpenseStatusHistory } from '../../entities/expense-status-history.entity';

describe('ExpenseWorkflowService', () => {
  let service: ExpenseWorkflowService;
  let entityManager: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn(),
    };

    const mockNotificationService = {
      notifyStatusChange: jest.fn(),
    };

    const mockReminderService = {
      createInvoiceCollectionReminder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseWorkflowService,
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
        {
          provide: 'NotificationService',
          useValue: mockNotificationService,
        },
        {
          provide: 'ReminderService',
          useValue: mockReminderService,
        },
      ],
    }).compile();

    service = module.get<ExpenseWorkflowService>(ExpenseWorkflowService);
    entityManager = module.get(EntityManager);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateExpenseStatus', () => {
    let expense: Expense;
    let user: User;

    beforeEach(() => {
      expense = new Expense();
      expense.id = 'expense-123';
      expense.status = ExpenseStatus.DRAFT;
      expense.vendor = 'Test Vendor';
      expense.amount = 100;
      expense.description = 'Test description';
      expense.date = new Date();
      expense.paymentMethod = PaymentMethod.CASH; // Add required payment method

      user = new User();
      user.id = 'user-123';
      user.name = 'Test User';
    });

    it('should update status from DRAFT to SUBMITTED', async () => {
      entityManager.findOne
        .mockResolvedValueOnce(expense)
        .mockResolvedValueOnce(user);

      const result = await service.updateExpenseStatus(
        'expense-123',
        ExpenseStatus.SUBMITTED,
        'user-123',
        'Ready for review',
      );

      expect(result.status).toBe(ExpenseStatus.SUBMITTED);
      expect(entityManager.persist).toHaveBeenCalled();
      expect(entityManager.flush).toHaveBeenCalled();
    });

    it('should throw error for invalid status transition', async () => {
      expense.status = ExpenseStatus.DRAFT;
      entityManager.findOne
        .mockResolvedValueOnce(expense)
        .mockResolvedValueOnce(user);

      await expect(
        service.updateExpenseStatus(
          'expense-123',
          ExpenseStatus.PAID,
          'user-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when expense not found', async () => {
      entityManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateExpenseStatus(
          'expense-123',
          ExpenseStatus.SUBMITTED,
          'user-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when user not found', async () => {
      entityManager.findOne
        .mockResolvedValueOnce(expense)
        .mockResolvedValueOnce(null);

      await expect(
        service.updateExpenseStatus(
          'expense-123',
          ExpenseStatus.SUBMITTED,
          'user-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate expense before submission', async () => {
      expense.vendor = ''; // Missing required field
      entityManager.findOne
        .mockResolvedValueOnce(expense)
        .mockResolvedValueOnce(user);

      await expect(
        service.updateExpenseStatus(
          'expense-123',
          ExpenseStatus.SUBMITTED,
          'user-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for same status transition', async () => {
      expense.status = ExpenseStatus.SUBMITTED;
      entityManager.findOne
        .mockResolvedValueOnce(expense)
        .mockResolvedValueOnce(user);

      await expect(
        service.updateExpenseStatus(
          'expense-123',
          ExpenseStatus.SUBMITTED,
          'user-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return available transitions for DRAFT status', () => {
      const transitions = service.getAvailableTransitions(ExpenseStatus.DRAFT);
      expect(transitions).toContain(ExpenseStatus.SUBMITTED);
    });

    it('should return available transitions for SUBMITTED status', () => {
      const transitions = service.getAvailableTransitions(
        ExpenseStatus.SUBMITTED,
      );
      expect(transitions).toContain(ExpenseStatus.APPROVED);
      expect(transitions).toContain(ExpenseStatus.DRAFT);
    });

    it('should return available transitions for APPROVED status', () => {
      const transitions = service.getAvailableTransitions(
        ExpenseStatus.APPROVED,
      );
      expect(transitions).toContain(ExpenseStatus.PAID);
      expect(transitions).toContain(ExpenseStatus.SUBMITTED);
    });

    it('should return available transitions for PAID status', () => {
      const transitions = service.getAvailableTransitions(ExpenseStatus.PAID);
      expect(transitions).toContain(ExpenseStatus.CLOSED);
      expect(transitions).toContain(ExpenseStatus.APPROVED);
    });

    it('should return empty array for CLOSED status', () => {
      const transitions = service.getAvailableTransitions(ExpenseStatus.CLOSED);
      expect(transitions).toHaveLength(0);
    });
  });

  describe('getExpenseStatusHistory', () => {
    it('should return status history for expense', async () => {
      const history = [
        {
          id: 'history-1',
          fromStatus: ExpenseStatus.DRAFT,
          toStatus: ExpenseStatus.SUBMITTED,
          createdAt: new Date(),
        },
      ];

      entityManager.find.mockResolvedValue(history);

      const result = await service.getExpenseStatusHistory('expense-123');

      expect(result).toEqual(history);
      expect(entityManager.find).toHaveBeenCalledWith(
        ExpenseStatusHistory,
        { expense: 'expense-123' },
        {
          populate: ['changedBy'],
          orderBy: { createdAt: 'DESC' },
        },
      );
    });
  });

  describe('canUserTransitionStatus', () => {
    it('should allow transition when no role restrictions', () => {
      const canTransition = service.canUserTransitionStatus(
        'USER',
        ExpenseStatus.DRAFT,
        ExpenseStatus.SUBMITTED,
      );

      expect(canTransition).toBe(true);
    });

    it('should not allow invalid transitions', () => {
      const canTransition = service.canUserTransitionStatus(
        'USER',
        ExpenseStatus.DRAFT,
        ExpenseStatus.PAID,
      );

      expect(canTransition).toBe(false);
    });
  });
});
