import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './services/expense.service';
import { ExpenseWorkflowService } from './services/expense-workflow.service';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  UpdateExpenseStatusDto,
  ExpenseQueryDto,
} from './dto';
import {
  Expense,
  ExpenseStatus,
  Currency,
  PaymentMethod,
} from '../entities/expense.entity';
import { ExpenseStatusHistory } from '../entities/expense-status-history.entity';

describe('ExpenseController', () => {
  let controller: ExpenseController;
  let expenseService: jest.Mocked<ExpenseService>;
  let workflowService: jest.Mocked<ExpenseWorkflowService>;

  beforeEach(async () => {
    const mockExpenseService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      remove: jest.fn(),
      hardDelete: jest.fn(),
      restore: jest.fn(),
      findDeleted: jest.fn(),
      findByPaymentId: jest.fn(),
      getExpenseStatistics: jest.fn(),
    };

    const mockWorkflowService = {
      getExpenseStatusHistory: jest.fn(),
      getAvailableTransitions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseController],
      providers: [
        {
          provide: ExpenseService,
          useValue: mockExpenseService,
        },
        {
          provide: ExpenseWorkflowService,
          useValue: mockWorkflowService,
        },
      ],
    }).compile();

    controller = module.get<ExpenseController>(ExpenseController);
    expenseService = module.get(ExpenseService);
    workflowService = module.get(ExpenseWorkflowService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create expense successfully', async () => {
      const createDto: CreateExpenseDto = {
        date: '2024-01-15',
        vendor: 'Test Vendor',
        category: 'Office Supplies',
        amount: 100.5,
        currency: Currency.VND,
        description: 'Test expense',
        submitterId: 'user-123',
        paymentMethod: PaymentMethod.CASH,
      };

      const expense = new Expense();
      expense.id = 'expense-123';
      expense.vendor = 'Test Vendor';

      const user = { id: 'user-123', email: 'test@example.com' };

      expenseService.create.mockResolvedValue(expense);

      const result = await controller.create(createDto, user);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expense);
      expect(result.message).toBe('Expense created successfully');
      expect(expenseService.create).toHaveBeenCalledWith(createDto);
    });

    it('should set submitterId to current user when not provided', async () => {
      const createDto: CreateExpenseDto = {
        date: '2024-01-15',
        vendor: 'Test Vendor',
        category: 'Office Supplies',
        amount: 100.5,
        currency: Currency.VND,
        description: 'Test expense',
        submitterId: '',
        paymentMethod: PaymentMethod.CASH,
      };

      const expense = new Expense();
      const user = { id: 'user-123', email: 'test@example.com' };

      expenseService.create.mockResolvedValue(expense);

      await controller.create(createDto, user);

      expect(createDto.submitterId).toBe('user-123');
    });
  });

  describe('findAll', () => {
    it('should return paginated expenses', async () => {
      const query: ExpenseQueryDto = { page: '1', limit: '10' };
      const paginatedResult = {
        data: [new Expense()],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      expenseService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(paginatedResult.data);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('getStatistics', () => {
    it('should return expense statistics', async () => {
      const stats = {
        totalExpenses: 10,
        totalAmount: 1000,
        statusCounts: { DRAFT: 5, IN_PROGRESS: 3, PAID: 2 },
      };

      const user = { id: 'user-123', email: 'test@example.com' };

      expenseService.getExpenseStatistics.mockResolvedValue(stats);

      const result = await controller.getStatistics(user);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(stats);
      expect(expenseService.getExpenseStatistics).toHaveBeenCalledWith(
        'user-123',
      );
    });
  });

  describe('findByPaymentId', () => {
    it('should return expenses by payment ID', async () => {
      const expenses = [new Expense(), new Expense()];
      expenseService.findByPaymentId.mockResolvedValue(expenses);

      const result = await controller.findByPaymentId('5');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expenses);
      expect(expenseService.findByPaymentId).toHaveBeenCalledWith('5');
    });
  });

  describe('findOne', () => {
    it('should return single expense', async () => {
      const expense = new Expense();
      expense.id = 'expense-123';

      expenseService.findOne.mockResolvedValue(expense);

      const result = await controller.findOne('expense-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expense);
    });
  });

  describe('getStatusHistory', () => {
    it('should return expense status history', async () => {
      const history = [
        {
          id: 'history-1',
          fromStatus: ExpenseStatus.DRAFT,
          toStatus: ExpenseStatus.SUBMITTED,
          createdAt: new Date(),
        },
      ];

      workflowService.getExpenseStatusHistory.mockResolvedValue(
        history as ExpenseStatusHistory[],
      );

      const result = await controller.getStatusHistory('expense-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(history);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return available status transitions', async () => {
      const expense = new Expense();
      expense.status = ExpenseStatus.DRAFT;

      const transitions = [ExpenseStatus.SUBMITTED];

      expenseService.findOne.mockResolvedValue(expense);
      workflowService.getAvailableTransitions.mockReturnValue(transitions);

      const result = await controller.getAvailableTransitions('expense-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(transitions);
    });
  });

  describe('update', () => {
    it('should update expense successfully', async () => {
      const updateDto: UpdateExpenseDto = {
        vendor: 'Updated Vendor',
        amount: 200,
      };

      const expense = new Expense();
      expense.vendor = 'Updated Vendor';

      expenseService.update.mockResolvedValue(expense);

      const user = { id: 'user-123', email: 'test@example.com' };

      const result = await controller.update('expense-123', updateDto, user);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expense);
      expect(result.message).toBe('Expense updated successfully');
    });
  });

  describe('updateStatus', () => {
    it('should update expense status successfully', async () => {
      const updateStatusDto: UpdateExpenseStatusDto = {
        status: ExpenseStatus.IN_PROGRESS,
        notes: 'Ready for review',
      };

      const expense = new Expense();
      expense.status = ExpenseStatus.SUBMITTED;

      const user = { id: 'user-123', email: 'test@example.com' };

      expenseService.updateStatus.mockResolvedValue(expense);

      const result = await controller.updateStatus(
        'expense-123',
        updateStatusDto,
        user,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expense);
      expect(result.message).toBe('Expense status updated to IN_PROGRESS');
      expect(expenseService.updateStatus).toHaveBeenCalledWith(
        'expense-123',
        ExpenseStatus.SUBMITTED,
        'user-123',
        'Ready for review',
      );
    });
  });

  describe('remove', () => {
    it('should delete expense successfully', async () => {
      expenseService.remove.mockResolvedValue();

      const result = await controller.remove('expense-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Expense deleted successfully');
      expect(expenseService.remove).toHaveBeenCalledWith('expense-123');
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete expense successfully', async () => {
      expenseService.hardDelete.mockResolvedValue();

      const result = await controller.hardDelete('expense-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Expense permanently deleted');
      expect(expenseService.hardDelete).toHaveBeenCalledWith('expense-123');
    });
  });

  describe('restore', () => {
    it('should restore expense successfully', async () => {
      const expense = new Expense();
      expense.id = 'expense-123';
      expenseService.restore.mockResolvedValue(expense);

      const result = await controller.restore('expense-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expense);
      expect(result.message).toBe('Expense restored successfully');
      expect(expenseService.restore).toHaveBeenCalledWith('expense-123');
    });
  });

  describe('findDeleted', () => {
    it('should return paginated deleted expenses', async () => {
      const query: ExpenseQueryDto = { page: '1', limit: '10' };
      const paginatedResult = {
        data: [new Expense()],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      expenseService.findDeleted.mockResolvedValue(paginatedResult);

      const result = await controller.findDeleted(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(paginatedResult.data);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });
});
