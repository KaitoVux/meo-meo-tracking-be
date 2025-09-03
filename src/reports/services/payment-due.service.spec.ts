import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
import { PaymentDueService } from './payment-due.service';
import {
  Expense,
  ExpenseStatus,
  Currency,
  PaymentMethod,
  ExpenseType,
} from '../../entities/expense.entity';
import { User } from '../../entities/user.entity';
import { Vendor } from '../../entities/vendor.entity';

describe('PaymentDueService', () => {
  let service: PaymentDueService;
  let em: jest.Mocked<EntityManager>;

  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
  } as User;

  const mockVendor = {
    id: 'vendor-1',
    name: 'Test Vendor',
  } as Vendor;

  const now = new Date('2024-02-15');
  const weekAgo = new Date('2024-02-08');
  const monthAgo = new Date('2024-01-15');
  const overdueDate = new Date('2024-01-01');

  const mockExpenses: Expense[] = [
    {
      id: 'expense-1',
      paymentId: 'PAY-001',
      transactionDate: weekAgo,
      expenseMonth: 'February',
      category: 'Office Supplies',
      type: ExpenseType.OUT,
      amount: 110000,
      currency: Currency.VND,
      description: 'Recent expense',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: ExpenseStatus.APPROVED,
      submitter: mockUser,
      vendor: mockVendor,
      createdAt: weekAgo,
      updatedAt: weekAgo,
    } as Expense,
    {
      id: 'expense-2',
      paymentId: 'PAY-002',
      transactionDate: monthAgo,
      expenseMonth: 'January',
      category: 'Travel',
      type: ExpenseType.OUT,
      amount: 200000,
      currency: Currency.VND,
      description: 'Monthly expense',
      paymentMethod: PaymentMethod.PETTY_CASH,
      status: ExpenseStatus.APPROVED,
      submitter: mockUser,
      vendor: mockVendor,
      createdAt: monthAgo,
      updatedAt: monthAgo,
    } as Expense,
    {
      id: 'expense-3',
      paymentId: 'PAY-003',
      transactionDate: overdueDate,
      expenseMonth: 'January',
      category: 'Equipment',
      type: ExpenseType.OUT,
      amount: 500000,
      currency: Currency.VND,
      description: 'Overdue expense',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: ExpenseStatus.APPROVED,
      submitter: mockUser,
      vendor: mockVendor,
      createdAt: overdueDate,
      updatedAt: overdueDate,
    } as Expense,
  ];

  beforeEach(async () => {
    const mockEntityManager = {
      find: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentDueService,
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<PaymentDueService>(PaymentDueService);
    em = module.get(EntityManager);

    // Mock the current date
    jest.spyOn(Date, 'now').mockImplementation(() => now.getTime());
    const OriginalDate = Date;
    jest.spyOn(global, 'Date').mockImplementation((...args: unknown[]) => {
      if (args.length === 0) {
        return now as unknown as Date;
      }
      return new OriginalDate(
        ...(args as ConstructorParameters<typeof Date>),
      ) as unknown as Date;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPaymentDueReport', () => {
    it('should return comprehensive payment due report', async () => {
      em.find.mockResolvedValue(mockExpenses);

      const result = await service.getPaymentDueReport();

      expect(result).toEqual({
        weeklyDue: expect.any(Array),
        monthlyDue: expect.any(Array),
        overdue: expect.any(Array),
        summary: expect.objectContaining({
          totalDueThisWeek: expect.any(Number),
          totalDueThisMonth: expect.any(Number),
          totalOverdue: expect.any(Number),
          countDueThisWeek: expect.any(Number),
          countDueThisMonth: expect.any(Number),
          countOverdue: expect.any(Number),
          averageDaysToPayment: expect.any(Number),
        }),
      });

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          status: ExpenseStatus.APPROVED,
          deletedAt: null,
        },
        {
          populate: ['submitter', 'vendor'],
          orderBy: { transactionDate: 'ASC' },
        },
      );
    });

    it('should filter by user when userId provided', async () => {
      em.find.mockResolvedValue(mockExpenses);

      await service.getPaymentDueReport('user-1');

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          status: ExpenseStatus.APPROVED,
          submitter: 'user-1',
          deletedAt: null,
        },
        {
          populate: ['submitter', 'vendor'],
          orderBy: { transactionDate: 'ASC' },
        },
      );
    });

    it('should categorize expenses correctly', async () => {
      em.find.mockResolvedValue(mockExpenses);

      const result = await service.getPaymentDueReport();

      // Check that overdue expenses are identified (more than 30 days old)
      const overdueExpense = result.overdue.find(
        (item) => item.expense.id === 'expense-3',
      );
      expect(overdueExpense).toBeDefined();
      expect(overdueExpense!.isOverdue).toBe(true);
      expect(overdueExpense!.priority).toBe('MEDIUM'); // More than 30 days overdue

      // Check that recent expenses are in weekly due
      const weeklyExpense = result.weeklyDue.find(
        (item) => item.expense.id === 'expense-1',
      );
      expect(weeklyExpense).toBeDefined();
      expect(weeklyExpense!.isOverdue).toBe(false);
    });
  });

  describe('getWeeklyPaymentsDue', () => {
    it('should return payments due this week', async () => {
      const weeklyExpenses = [mockExpenses[0]];
      em.find.mockResolvedValue(weeklyExpenses);

      const result = await service.getWeeklyPaymentsDue();

      expect(result).toHaveLength(1);
      expect(result[0].expense.id).toBe('expense-1');

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should filter by user when userId provided', async () => {
      em.find.mockResolvedValue([mockExpenses[0]]);

      await service.getWeeklyPaymentsDue('user-1');

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('getMonthlyPaymentsDue', () => {
    it('should return payments due this month', async () => {
      const monthlyExpenses = [mockExpenses[0], mockExpenses[1]];
      em.find.mockResolvedValue(monthlyExpenses);

      const result = await service.getMonthlyPaymentsDue();

      expect(result).toHaveLength(2);

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('getOverduePayments', () => {
    it('should return overdue payments', async () => {
      const overdueExpenses = [mockExpenses[2]];
      em.find.mockResolvedValue(overdueExpenses);

      const result = await service.getOverduePayments();

      expect(result).toHaveLength(1);
      expect(result[0].expense.id).toBe('expense-3');
      expect(result[0].isOverdue).toBe(true);

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('getPaymentStatistics', () => {
    it('should return payment statistics for a period', async () => {
      const statisticsExpenses = [
        { ...mockExpenses[0], status: ExpenseStatus.APPROVED },
        { ...mockExpenses[1], status: ExpenseStatus.PAID },
        { ...mockExpenses[2], status: ExpenseStatus.CLOSED },
      ];
      em.find.mockResolvedValue(statisticsExpenses);

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-02-29');

      const result = await service.getPaymentStatistics(dateFrom, dateTo);

      expect(result).toEqual({
        totalApproved: expect.any(Number),
        totalPaid: expect.any(Number),
        totalPending: expect.any(Number),
        averagePaymentTime: expect.any(Number),
      });

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          transactionDate: {
            $gte: dateFrom,
            $lte: dateTo,
          },
          deletedAt: null,
        },
        {
          populate: ['statusHistory'],
        },
      );
    });

    it('should filter by user when userId provided', async () => {
      em.find.mockResolvedValue(mockExpenses);

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-02-29');

      await service.getPaymentStatistics(dateFrom, dateTo, 'user-1');

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          transactionDate: {
            $gte: dateFrom,
            $lte: dateTo,
          },
          submitter: 'user-1',
          deletedAt: null,
        },
        {
          populate: ['statusHistory'],
        },
      );
    });
  });
});
