import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import { ExportFormat } from '../dto/export-query.dto';
import { ReportData } from './report-generation.service';
import {
  Expense,
  ExpenseStatus,
  Currency,
  PaymentMethod,
  ExpenseType,
} from '../../entities/expense.entity';
import { User } from '../../entities/user.entity';
import { Vendor } from '../../entities/vendor.entity';

describe('ExportService', () => {
  let service: ExportService;

  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
  } as User;

  const mockVendor = {
    id: 'vendor-1',
    name: 'Test Vendor',
  } as Vendor;

  const mockExpense: Expense = {
    id: 'expense-1',
    paymentId: 'PAY-001',
    subId: '1',
    transactionDate: new Date('2024-01-15'),
    expenseMonth: 'January',
    category: 'Office Supplies',
    type: ExpenseType.OUT,
    amountBeforeVAT: 100000,
    vatPercentage: 10,
    vatAmount: 10000,
    amount: 110000,
    currency: Currency.VND,
    description: 'Test expense',
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    status: ExpenseStatus.APPROVED,
    submitter: mockUser,
    vendor: mockVendor,
    projectCostCenter: 'IT Department',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  } as Expense;

  const mockReportData: ReportData = {
    expenses: [mockExpense],
    summary: {
      totalExpenses: 1,
      totalAmount: 110000,
      totalAmountVND: 110000,
      totalAmountUSD: 0,
      averageAmount: 110000,
      statusBreakdown: {
        [ExpenseStatus.DRAFT]: 0,
        [ExpenseStatus.SUBMITTED]: 0,
        [ExpenseStatus.APPROVED]: 1,
        [ExpenseStatus.PAID]: 0,
        [ExpenseStatus.CLOSED]: 0,
      },
      dateRange: {
        from: new Date('2024-01-15'),
        to: new Date('2024-01-15'),
      },
    },
    groupedData: [
      {
        groupKey: 'Office Supplies',
        groupLabel: 'Office Supplies',
        expenses: [mockExpense],
        totalAmount: 110000,
        expenseCount: 1,
        percentage: 100,
      },
    ],
    metadata: {
      generatedAt: new Date('2024-01-15'),
      generatedBy: 'user-1',
      filters: {},
      recordCount: 1,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExportService],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportReport', () => {
    it('should export report in CSV format', () => {
      const result = service.exportReport(
        mockReportData,
        ExportFormat.CSV,
        'detailed',
      );

      expect(result.mimeType).toBe('text/csv');
      expect(result.filename).toMatch(
        /expense-report-detailed-\d{4}-\d{2}-\d{2}\.csv/,
      );
      expect(result.buffer).toBeInstanceOf(Buffer);

      const csvContent = result.buffer.toString('utf-8');
      expect(csvContent).toContain('Payment ID,Sub ID,Transaction Date');
      expect(csvContent).toContain('PAY-001,1,2024-01-15');
      expect(csvContent).toContain('Test Vendor');
      expect(csvContent).toContain('Office Supplies');
    });

    it('should export summary report in CSV format', () => {
      const result = service.exportReport(
        mockReportData,
        ExportFormat.CSV,
        'summary',
      );

      expect(result.mimeType).toBe('text/csv');
      expect(result.filename).toMatch(
        /expense-report-summary-\d{4}-\d{2}-\d{2}\.csv/,
      );

      const csvContent = result.buffer.toString('utf-8');
      expect(csvContent).toContain('Expense Report Summary');
      expect(csvContent).toContain('Total Expenses,1');
      expect(csvContent).toContain('Total Amount,110000');
      expect(csvContent).toContain('Status Breakdown');
      expect(csvContent).toContain('Grouped Data');
    });

    it('should export report in Excel format', () => {
      const result = service.exportReport(
        mockReportData,
        ExportFormat.EXCEL,
        'detailed',
      );

      expect(result.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(result.filename).toMatch(
        /expense-report-detailed-\d{4}-\d{2}-\d{2}\.xlsx/,
      );
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should export report in PDF format', () => {
      const result = service.exportReport(
        mockReportData,
        ExportFormat.PDF,
        'detailed',
      );

      expect(result.mimeType).toBe('application/pdf');
      expect(result.filename).toMatch(
        /expense-report-detailed-\d{4}-\d{2}-\d{2}\.pdf/,
      );
      expect(result.buffer).toBeInstanceOf(Buffer);

      const pdfContent = result.buffer.toString('utf-8');
      expect(pdfContent).toContain('DETAILED EXPENSE REPORT');
      expect(pdfContent).toContain('Payment ID: PAY-001-1');
      expect(pdfContent).toContain('Test Vendor');
    });

    it('should throw error for unsupported format', () => {
      expect(() =>
        service.exportReport(
          mockReportData,
          'UNSUPPORTED' as ExportFormat,
          'detailed',
        ),
      ).toThrow('Unsupported export format: UNSUPPORTED');
    });
  });
});
