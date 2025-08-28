import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
import { DashboardService } from './dashboard.service';
import {
  Expense,
  ExpenseStatus,
  Currency,
  PaymentMethod,
  ExpenseType,
} from '../../entities/expense.entity';
import { User } from '../../entities/user.entity';
import { Vendor } from '../../entities/vendor.entity';

describe('DashboardService', () => {
  let service: DashboardService;
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

  const mockExpenses: Expense[] = [
    {
      id: 'expense-1',
      paymentId: 'PAY-001',
      transactionDate: new Date('2024-01-15'),
      expenseMonth: 'January',
      category: 'Office Supplies',
      type: ExpenseType.OUT,
      amountBeforeVAT: 100000,
      vatPercentage: 10,
      vatAmount: 10000,
      amount: 110000,
      currency: Currency.VND,
      description: 'Test expense 1',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: ExpenseStatus.APPROVED,
      submitter: mockUser,
      vendor: mockVendor,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    } as Expense,
    {
      id: 'expense-2',
      paymentId: 'PAY-002',
      transactionDate: new Date('2024-02-10'),
      expenseMonth: 'February',
      category: 'Travel',
      type: ExpenseType.OUT,
      amountBeforeVAT: 200000,
      vatPercentage: 0,
      vatAmount: 0,
      amount: 200000,
      currency: Currency.USD,
      description: 'Test expense 2',
      paymentMethod: PaymentMethod.CASH,
      status: ExpenseStatus.PAID,
      submitter: mockUser,
      vendor: mockVendor,
      createdAt: new Date('2024-02-10'),
      updatedAt: new Date('2024-02-10'),
    } as Expense,
  ];

  beforeEach(async () => {
    const mockEntityManager = {
      find: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    em = module.get(EntityManager);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardStatistics', () => {
    it('should return comprehensive dashboard statistics', async () => {
      em.find.mockResolvedValue(mockExpenses);

      const result = await service.getDashboardStatistics({});

      expect(result).toEqual({
        totalExpenses: 2,
        totalAmount: 310000, // 110000 VND + 200000 USD (treated as same currency for total)
        totalAmountVND: 110000,
        totalAmountUSD: 200000,
        statusCounts: {
          [ExpenseStatus.DRAFT]: 0,
          [ExpenseStatus.SUBMITTED]: 0,
          [ExpenseStatus.APPROVED]: 1,
          [ExpenseStatus.PAID]: 1,
          [ExpenseStatus.CLOSED]: 0,
        },
        monthlyTotals: expect.any(Array),
        quarterlyTotals: expect.any(Array),
        yearlyTotals: expect.any(Array),
        categoryBreakdown: expect.any(Array),
        vendorBreakdown: expect.any(Array),
        recentExpenses: expect.any(Array),
        paymentMethodBreakdown: expect.any(Array),
        averageExpenseAmount: 155000,
        expensesBySubmitter: expect.any(Array),
      });

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        { deletedAt: null },
        {
          populate: ['submitter', 'vendor'],
          orderBy: { transactionDate: 'DESC' },
        },
      );
    });

    it('should filter by month when provided', async () => {
      em.find.mockResolvedValue([mockExpenses[0]]);

      await service.getDashboardStatistics({ month: '2024-01' });

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          transactionDate: {
            $gte: new Date(2024, 0, 1),
            $lte: new Date(2024, 1, 0),
          },
          deletedAt: null,
        },
        {
          populate: ['submitter', 'vendor'],
          orderBy: { transactionDate: 'DESC' },
        },
      );
    });

    it('should filter by vendor when provided', async () => {
      em.find.mockResolvedValue(mockExpenses);

      await service.getDashboardStatistics({ vendor: 'Test Vendor' });

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          vendor: { name: { $ilike: '%Test Vendor%' } },
          deletedAt: null,
        },
        {
          populate: ['submitter', 'vendor'],
          orderBy: { transactionDate: 'DESC' },
        },
      );
    });

    it('should filter by category when provided', async () => {
      em.find.mockResolvedValue(mockExpenses);

      await service.getDashboardStatistics({ category: 'Office' });

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          category: { $ilike: '%Office%' },
          deletedAt: null,
        },
        {
          populate: ['submitter', 'vendor'],
          orderBy: { transactionDate: 'DESC' },
        },
      );
    });
  });
  describe('getMonthlyStatistics', () => {
    it('should return monthly statistics for a specific year and month', async () => {
      em.find.mockResolvedValue([mockExpenses[0]]);

      const result = await service.getMonthlyStatistics(2024, 1);

      expect(result).toEqual([
        {
          month: '2024-01',
          monthName: 'January 2024',
          totalAmount: 110000,
          totalAmountVND: 110000,
          totalAmountUSD: 0,
          expenseCount: 1,
        },
      ]);

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          transactionDate: {
            $gte: new Date(2024, 0, 1),
            $lte: new Date(2024, 1, 0),
          },
          deletedAt: null,
        },
        {
          populate: ['vendor'],
        },
      );
    });

    it('should return monthly statistics for entire year when month not specified', async () => {
      em.find.mockResolvedValue(mockExpenses);

      const result = await service.getMonthlyStatistics(2024);

      expect(result).toHaveLength(2);
      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          transactionDate: {
            $gte: new Date(2024, 0, 1),
            $lte: new Date(2025, 0, 0),
          },
          deletedAt: null,
        },
        {
          populate: ['vendor'],
        },
      );
    });
  });

  describe('getQuarterlyStatistics', () => {
    it('should return quarterly statistics for a specific year', async () => {
      em.find.mockResolvedValue(mockExpenses);

      const result = await service.getQuarterlyStatistics(2024);

      expect(result).toEqual([
        {
          quarter: 'Q1 2024',
          year: 2024,
          quarterNumber: 1,
          totalAmount: 310000,
          totalAmountVND: 110000,
          totalAmountUSD: 200000,
          expenseCount: 2,
        },
      ]);

      expect(em.find).toHaveBeenCalled();
    });
  });

  describe('getYearlyStatistics', () => {
    it('should return yearly statistics', async () => {
      em.find.mockResolvedValue(mockExpenses);

      const result = await service.getYearlyStatistics();

      expect(result).toEqual([
        {
          year: 2024,
          totalAmount: 310000,
          totalAmountVND: 110000,
          totalAmountUSD: 200000,
          expenseCount: 2,
        },
      ]);

      expect(em.find).toHaveBeenCalled();
    });
  });
});
