import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
import { ReportGenerationService } from './report-generation.service';
import {
  Expense,
  ExpenseStatus,
  Currency,
  PaymentMethod,
  ExpenseType,
} from '../../entities/expense.entity';
import { User } from '../../entities/user.entity';
import { Vendor } from '../../entities/vendor.entity';
import { ReportQueryDto } from '../dto/report-query.dto';

describe('ReportGenerationService', () => {
  let service: ReportGenerationService;
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
        ReportGenerationService,
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<ReportGenerationService>(ReportGenerationService);
    em = module.get(EntityManager);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateReport', () => {
    it('should generate a comprehensive report', async () => {
      const query: ReportQueryDto = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      };

      em.find.mockResolvedValue(mockExpenses);

      const result = await service.generateReport(query, 'user-1');

      expect(result).toEqual({
        expenses: mockExpenses,
        summary: {
          totalExpenses: 2,
          totalAmount: 310000,
          totalAmountVND: 110000,
          totalAmountUSD: 200000,
          averageAmount: 155000,
          statusBreakdown: {
            [ExpenseStatus.APPROVED]: 1,
            [ExpenseStatus.PAID]: 1,
          },
          dateRange: {
            from: new Date('2024-01-15'),
            to: new Date('2024-02-10'),
          },
        },
        groupedData: undefined,
        metadata: {
          generatedAt: expect.any(Date),
          generatedBy: 'user-1',
          filters: query,
          recordCount: 2,
        },
      });

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          transactionDate: {
            $gte: new Date('2024-01-01'),
            $lte: new Date('2024-12-31'),
          },
          deletedAt: null,
        },
        {
          populate: ['submitter', 'vendor', 'invoiceFile', 'statusHistory'],
          orderBy: { transactionDate: 'DESC' },
        },
      );
    });

    it('should generate grouped report when groupBy is specified', async () => {
      const query: ReportQueryDto = {
        groupBy: 'category',
      };

      em.find.mockResolvedValue(mockExpenses);

      const result = await service.generateReport(query, 'user-1');

      expect(result.groupedData).toBeDefined();
      expect(result.groupedData).toHaveLength(2);
      // The groupedData is sorted by totalAmount descending, so Travel (200000) comes first
      expect(result.groupedData![0]).toEqual({
        groupKey: 'Travel',
        groupLabel: 'Travel',
        expenses: [mockExpenses[1]],
        totalAmount: 200000,
        expenseCount: 1,
        percentage: expect.any(Number),
      });
    });
    it('should filter by categories when provided', async () => {
      const query: ReportQueryDto = {
        categories: ['Office Supplies', 'Travel'],
      };

      em.find.mockResolvedValue(mockExpenses);

      await service.generateReport(query);

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          category: { $in: ['Office Supplies', 'Travel'] },
          deletedAt: null,
        },
        {
          populate: ['submitter', 'vendor', 'invoiceFile', 'statusHistory'],
          orderBy: { transactionDate: 'DESC' },
        },
      );
    });

    it('should filter by vendors when provided', async () => {
      const query: ReportQueryDto = {
        vendors: ['Test Vendor'],
      };

      em.find.mockResolvedValue(mockExpenses);

      await service.generateReport(query);

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          vendor: { name: { $in: ['Test Vendor'] } },
          deletedAt: null,
        },
        {
          populate: ['submitter', 'vendor', 'invoiceFile', 'statusHistory'],
          orderBy: { transactionDate: 'DESC' },
        },
      );
    });

    it('should filter by statuses when provided', async () => {
      const query: ReportQueryDto = {
        statuses: [ExpenseStatus.APPROVED, ExpenseStatus.PAID],
      };

      em.find.mockResolvedValue(mockExpenses);

      await service.generateReport(query);

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          status: { $in: [ExpenseStatus.APPROVED, ExpenseStatus.PAID] },
          deletedAt: null,
        },
        {
          populate: ['submitter', 'vendor', 'invoiceFile', 'statusHistory'],
          orderBy: { transactionDate: 'DESC' },
        },
      );
    });
  });

  describe('generatePaginatedReport', () => {
    it('should generate paginated report with correct pagination info', async () => {
      const query: ReportQueryDto = {};

      em.count.mockResolvedValue(150);
      em.find
        .mockResolvedValueOnce(mockExpenses.slice(0, 2)) // Paginated expenses
        .mockResolvedValueOnce(mockExpenses); // All expenses for summary

      const result = await service.generatePaginatedReport(
        query,
        1,
        50,
        'user-1',
      );

      expect(result.metadata.pageInfo).toEqual({
        page: 1,
        limit: 50,
        totalPages: 3,
      });
      expect(result.metadata.recordCount).toBe(150);

      expect(em.count).toHaveBeenCalledWith(Expense, { deletedAt: null });
      expect(em.find).toHaveBeenCalledTimes(2);
    });

    it('should enforce 100 record limit', async () => {
      const query: ReportQueryDto = {};

      em.count.mockResolvedValue(200);
      em.find.mockResolvedValue(mockExpenses);

      await service.generatePaginatedReport(query, 1, 150, 'user-1');

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        { deletedAt: null },
        {
          populate: ['submitter', 'vendor', 'invoiceFile', 'statusHistory'],
          orderBy: { transactionDate: 'DESC' },
          limit: 100, // Should be capped at 100
          offset: 0,
        },
      );
    });
  });

  describe('generateCategoryReport', () => {
    it('should generate category-specific report', async () => {
      const categories = ['Office Supplies'];
      const query = { dateFrom: '2024-01-01' };

      em.find.mockResolvedValue([mockExpenses[0]]);

      const result = await service.generateCategoryReport(
        categories,
        query,
        'user-1',
      );

      expect(result.groupedData).toBeDefined();
      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          category: { $in: ['Office Supplies'] },
          transactionDate: { $gte: new Date('2024-01-01') },
          deletedAt: null,
        },
        expect.any(Object),
      );
    });
  });

  describe('generateVendorReport', () => {
    it('should generate vendor-specific report', async () => {
      const vendors = ['Test Vendor'];
      const query = { dateFrom: '2024-01-01' };

      em.find.mockResolvedValue(mockExpenses);

      const result = await service.generateVendorReport(
        vendors,
        query,
        'user-1',
      );

      expect(result.groupedData).toBeDefined();
      expect(em.find).toHaveBeenCalledWith(
        Expense,
        {
          vendor: { name: { $in: ['Test Vendor'] } },
          transactionDate: { $gte: new Date('2024-01-01') },
          deletedAt: null,
        },
        expect.any(Object),
      );
    });
  });
});
