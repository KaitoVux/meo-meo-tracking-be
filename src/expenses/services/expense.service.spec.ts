import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ExpenseService } from './expense.service';
import { ExpenseValidationService } from './expense-validation.service';
import { PaymentIdService } from './payment-id.service';
import { ExpenseWorkflowService } from './expense-workflow.service';
import {
  Expense,
  ExpenseStatus,
  Currency,
  PaymentMethod,
} from '../../entities/expense.entity';
import { User } from '../../entities/user.entity';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from '../dto';

describe('ExpenseService', () => {
  let service: ExpenseService;
  let entityManager: jest.Mocked<EntityManager>;
  let validationService: jest.Mocked<ExpenseValidationService>;
  let paymentIdService: jest.Mocked<PaymentIdService>;
  let workflowService: jest.Mocked<ExpenseWorkflowService>;

  beforeEach(async () => {
    const mockEntityManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      persist: jest.fn(),
      remove: jest.fn(),
      flush: jest.fn(),
    };

    const mockValidationService = {
      validateExpenseCreation: jest.fn(),
      validateExpenseUpdate: jest.fn(),
      validateOrThrow: jest.fn(),
    };

    const mockPaymentIdService = {
      generatePaymentId: jest.fn(),
    };

    const mockWorkflowService = {
      updateExpenseStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
        {
          provide: ExpenseValidationService,
          useValue: mockValidationService,
        },
        {
          provide: PaymentIdService,
          useValue: mockPaymentIdService,
        },
        {
          provide: ExpenseWorkflowService,
          useValue: mockWorkflowService,
        },
      ],
    }).compile();

    service = module.get<ExpenseService>(ExpenseService);
    entityManager = module.get(EntityManager);
    validationService = module.get(ExpenseValidationService);
    paymentIdService = module.get(PaymentIdService);
    workflowService = module.get(ExpenseWorkflowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    let createDto: CreateExpenseDto;
    let user: User;

    beforeEach(() => {
      createDto = {
        date: '2024-01-15',
        vendor: 'Test Vendor',
        category: 'Office Supplies',
        amount: 100.5,
        currency: Currency.VND,
        description: 'Test expense',
        submitterId: 'user-123',
        paymentMethod: PaymentMethod.CASH,
      };

      user = new User();
      user.id = 'user-123';
      user.name = 'Test User';
    });

    it('should create expense successfully', async () => {
      validationService.validateExpenseCreation.mockReturnValue({
        isValid: true,
        errors: [],
        missingFields: [],
      });
      entityManager.findOne.mockResolvedValue(user);
      paymentIdService.generatePaymentId.mockResolvedValue({
        paymentId: '1',
      });

      const result = await service.create(createDto);

      expect(result).toBeInstanceOf(Expense);
      expect(result.vendor).toBe('Test Vendor');
      expect(result.paymentId).toBe('1');
      expect(result.status).toBe(ExpenseStatus.DRAFT);
      expect(entityManager.persist).toHaveBeenCalled();
      expect(entityManager.flush).toHaveBeenCalled();
    });

    it('should throw error when validation fails', async () => {
      validationService.validateExpenseCreation.mockReturnValue({
        isValid: false,
        errors: ['Test error'],
        missingFields: ['Test field'],
      });
      validationService.validateOrThrow.mockImplementation(() => {
        throw new BadRequestException('Validation failed');
      });

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when submitter not found', async () => {
      validationService.validateExpenseCreation.mockReturnValue({
        isValid: true,
        errors: [],
        missingFields: [],
      });
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create expense with sub-ID', async () => {
      validationService.validateExpenseCreation.mockReturnValue({
        isValid: true,
        errors: [],
        missingFields: [],
      });
      entityManager.findOne.mockResolvedValue(user);
      paymentIdService.generatePaymentId.mockResolvedValue({
        paymentId: '5',
        subId: '2',
      });

      const result = await service.create(createDto);

      expect(result.paymentId).toBe('5');
      expect(result.subId).toBe('2');
    });
  });

  describe('findAll', () => {
    it('should return paginated expenses', async () => {
      const expenses = [new Expense(), new Expense()];
      entityManager.findAndCount.mockResolvedValue([expenses, 2]);

      const query: ExpenseQueryDto = { page: '1', limit: '10' };
      const result = await service.findAll(query);

      expect(result.data).toEqual(expenses);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should enforce 100 record limit', async () => {
      const expenses = [];
      entityManager.findAndCount.mockResolvedValue([expenses, 0]);

      const query: ExpenseQueryDto = { page: '1', limit: '200' };
      await service.findAll(query);

      expect(entityManager.findAndCount).toHaveBeenCalledWith(
        Expense,
        {},
        expect.objectContaining({ limit: 100 }),
      );
    });

    it('should filter by vendor', async () => {
      const expenses = [];
      entityManager.findAndCount.mockResolvedValue([expenses, 0]);

      const query: ExpenseQueryDto = { vendor: 'Test Vendor' };
      await service.findAll(query);

      expect(entityManager.findAndCount).toHaveBeenCalledWith(
        Expense,
        expect.objectContaining({
          vendor: { $ilike: '%Test Vendor%' },
        }),
        expect.any(Object),
      );
    });

    it('should filter by date range', async () => {
      const expenses = [];
      entityManager.findAndCount.mockResolvedValue([expenses, 0]);

      const query: ExpenseQueryDto = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };
      await service.findAll(query);

      expect(entityManager.findAndCount).toHaveBeenCalledWith(
        Expense,
        expect.objectContaining({
          date: {
            $gte: new Date('2024-01-01'),
            $lte: new Date('2024-01-31'),
          },
        }),
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    it('should return expense when found', async () => {
      const expense = new Expense();
      expense.id = 'expense-123';
      entityManager.findOne.mockResolvedValue(expense);

      const result = await service.findOne('expense-123');

      expect(result).toEqual(expense);
    });

    it('should throw NotFoundException when expense not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.findOne('expense-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    let expense: Expense;
    let updateDto: UpdateExpenseDto;

    beforeEach(() => {
      expense = new Expense();
      expense.id = 'expense-123';
      expense.status = ExpenseStatus.DRAFT;
      expense.vendor = 'Old Vendor';

      updateDto = {
        vendor: 'New Vendor',
        amount: 200,
      };
    });

    it('should update expense successfully', async () => {
      entityManager.findOne.mockResolvedValue(expense);
      validationService.validateExpenseUpdate.mockReturnValue({
        isValid: true,
        errors: [],
        missingFields: [],
      });

      const result = await service.update('expense-123', updateDto);

      expect(result.vendor).toBe('New Vendor');
      expect(result.amount).toBe(200);
      expect(entityManager.flush).toHaveBeenCalled();
    });

    it('should throw error when updating closed expense', async () => {
      expense.status = ExpenseStatus.CLOSED;
      entityManager.findOne.mockResolvedValue(expense);

      await expect(service.update('expense-123', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when validation fails', async () => {
      entityManager.findOne.mockResolvedValue(expense);
      validationService.validateExpenseUpdate.mockReturnValue({
        isValid: false,
        errors: ['Test error'],
        missingFields: [],
      });
      validationService.validateOrThrow.mockImplementation(() => {
        throw new BadRequestException('Validation failed');
      });

      await expect(service.update('expense-123', updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should delegate to workflow service', async () => {
      const expense = new Expense();
      workflowService.updateExpenseStatus.mockResolvedValue(expense);

      const result = await service.updateStatus(
        'expense-123',
        ExpenseStatus.SUBMITTED,
        'user-123',
        'notes',
      );

      expect(workflowService.updateExpenseStatus).toHaveBeenCalledWith(
        'expense-123',
        ExpenseStatus.SUBMITTED,
        'user-123',
        'notes',
      );
      expect(result).toEqual(expense);
    });
  });

  describe('remove', () => {
    it('should soft delete draft expense', async () => {
      const expense = new Expense();
      expense.status = ExpenseStatus.DRAFT;
      entityManager.findOne.mockResolvedValue(expense);

      await service.remove('expense-123');

      expect(expense.deletedAt).toBeInstanceOf(Date);
      expect(entityManager.flush).toHaveBeenCalled();
    });

    it('should throw error when deleting non-draft expense', async () => {
      const expense = new Expense();
      expense.status = ExpenseStatus.SUBMITTED;
      entityManager.findOne.mockResolvedValue(expense);

      await expect(service.remove('expense-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete draft expense', async () => {
      const expense = new Expense();
      expense.status = ExpenseStatus.DRAFT;
      entityManager.findOne.mockResolvedValue(expense);

      await service.hardDelete('expense-123');

      expect(entityManager.remove).toHaveBeenCalledWith(expense);
      expect(entityManager.flush).toHaveBeenCalled();
    });

    it('should throw error when hard deleting non-draft expense', async () => {
      const expense = new Expense();
      expense.status = ExpenseStatus.SUBMITTED;
      entityManager.findOne.mockResolvedValue(expense);

      await expect(service.hardDelete('expense-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('restore', () => {
    it('should restore soft-deleted expense', async () => {
      const expense = new Expense();
      expense.deletedAt = new Date();
      entityManager.findOne.mockResolvedValue(expense);

      const result = await service.restore('expense-123');

      expect(result.deletedAt).toBeUndefined();
      expect(entityManager.flush).toHaveBeenCalled();
    });

    it('should throw error when restoring non-deleted expense', async () => {
      const expense = new Expense();
      expense.deletedAt = undefined;
      entityManager.findOne.mockResolvedValue(expense);

      await expect(service.restore('expense-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when expense not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.restore('expense-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findDeleted', () => {
    it('should return paginated deleted expenses', async () => {
      const expenses = [new Expense(), new Expense()];
      entityManager.findAndCount.mockResolvedValue([expenses, 2]);

      const query: ExpenseQueryDto = { page: '1', limit: '10' };
      const result = await service.findDeleted(query);

      expect(result.data).toEqual(expenses);
      expect(result.total).toBe(2);
      expect(entityManager.findAndCount).toHaveBeenCalledWith(
        Expense,
        expect.objectContaining({
          deletedAt: { $ne: null },
        }),
        expect.any(Object),
      );
    });
  });

  describe('findByPaymentId', () => {
    it('should return expenses with same payment ID', async () => {
      const expenses = [new Expense(), new Expense()];
      entityManager.find.mockResolvedValue(expenses);

      const result = await service.findByPaymentId('5');

      expect(result).toEqual(expenses);
      expect(entityManager.find).toHaveBeenCalledWith(
        Expense,
        { paymentId: '5' },
        expect.objectContaining({
          populate: ['submitter'],
          orderBy: { subId: 'ASC' },
        }),
      );
    });
  });

  describe('getExpenseStatistics', () => {
    it('should return expense statistics', async () => {
      const mockExpensesForAmount = [
        { amount: 100 },
        { amount: 200 },
        { amount: 300 },
      ];
      const mockExpensesForStatus = [
        { status: 'DRAFT' },
        { status: 'DRAFT' },
        { status: 'SUBMITTED' },
        { status: 'APPROVED' },
      ];

      entityManager.count.mockResolvedValue(10);
      entityManager.find
        .mockResolvedValueOnce(mockExpensesForAmount)
        .mockResolvedValueOnce(mockExpensesForStatus);

      const result = await service.getExpenseStatistics();

      expect(result.totalExpenses).toBe(10);
      expect(result.totalAmount).toBe(600);
      expect(result.statusCounts).toEqual({
        DRAFT: 2,
        SUBMITTED: 1,
        APPROVED: 1,
      });
    });

    it('should handle empty statistics', async () => {
      entityManager.count.mockResolvedValue(0);
      entityManager.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.getExpenseStatistics();

      expect(result.totalExpenses).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.statusCounts).toEqual({});
    });
  });
});
