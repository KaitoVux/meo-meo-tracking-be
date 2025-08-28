import { Injectable } from '@nestjs/common';
import { EntityManager, FilterQuery, QueryOrder } from '@mikro-orm/core';
import {
  Expense,
  ExpenseStatus,
  Currency,
} from '../../entities/expense.entity';
import { ReportQueryDto } from '../dto/report-query.dto';

export interface ReportData {
  expenses: Expense[];
  summary: ReportSummary;
  groupedData?: GroupedReportData[];
  metadata: ReportMetadata;
}

export interface ReportSummary {
  totalExpenses: number;
  totalAmount: number;
  totalAmountVND: number;
  totalAmountUSD: number;
  averageAmount: number;
  statusBreakdown: Record<ExpenseStatus, number>;
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface GroupedReportData {
  groupKey: string;
  groupLabel: string;
  expenses: Expense[];
  totalAmount: number;
  expenseCount: number;
  percentage: number;
}

export interface ReportMetadata {
  generatedAt: Date;
  generatedBy?: string;
  filters: ReportQueryDto;
  recordCount: number;
  pageInfo?: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class ReportGenerationService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Generate comprehensive expense report with filtering
   * Requirements: 3.2, 3.3
   */
  async generateReport(
    query: ReportQueryDto,
    userId?: string,
  ): Promise<ReportData> {
    const where = this.buildFilterQuery(query);
    const orderBy = this.buildOrderBy(query);

    // Get filtered expenses
    const expenses = await this.em.find(Expense, where, {
      populate: ['submitter', 'vendor', 'invoiceFile', 'statusHistory'],
      orderBy,
    });

    // Calculate summary statistics
    const summary = this.calculateSummary(expenses);

    // Group data if requested
    let groupedData: GroupedReportData[] | undefined;
    if (query.groupBy) {
      groupedData = this.groupExpenses(
        expenses,
        query.groupBy,
        summary.totalAmount,
      );
    }

    // Create metadata
    const metadata: ReportMetadata = {
      generatedAt: new Date(),
      generatedBy: userId,
      filters: query,
      recordCount: expenses.length,
    };

    return {
      expenses,
      summary,
      groupedData,
      metadata,
    };
  }

  /**
   * Generate filtered expense report with pagination
   * Requirement: 3.7 (100 records per page limit)
   */
  async generatePaginatedReport(
    query: ReportQueryDto,
    page: number = 1,
    limit: number = 100,
    userId?: string,
  ): Promise<ReportData> {
    // Enforce 100 record limit
    const actualLimit = Math.min(limit, 100);
    const offset = (page - 1) * actualLimit;

    const where = this.buildFilterQuery(query);
    const orderBy = this.buildOrderBy(query);

    // Get total count for pagination info
    const totalCount = await this.em.count(Expense, where);

    // Get paginated expenses
    const expenses = await this.em.find(Expense, where, {
      populate: ['submitter', 'vendor', 'invoiceFile', 'statusHistory'],
      orderBy,
      limit: actualLimit,
      offset,
    });

    // For summary, we need all matching records, not just the page
    const allExpenses = await this.em.find(Expense, where, {
      fields: ['amount', 'currency', 'status', 'transactionDate'],
    });

    const summary = this.calculateSummary(allExpenses as Expense[]);

    // Group data if requested (use all expenses for accurate grouping)
    let groupedData: GroupedReportData[] | undefined;
    if (query.groupBy) {
      const allExpensesForGrouping = await this.em.find(Expense, where, {
        populate: ['submitter', 'vendor'],
      });
      groupedData = this.groupExpenses(
        allExpensesForGrouping,
        query.groupBy,
        summary.totalAmount,
      );
    }

    const metadata: ReportMetadata = {
      generatedAt: new Date(),
      generatedBy: userId,
      filters: query,
      recordCount: totalCount,
      pageInfo: {
        page,
        limit: actualLimit,
        totalPages: Math.ceil(totalCount / actualLimit),
      },
    };

    return {
      expenses,
      summary,
      groupedData,
      metadata,
    };
  }

  /**
   * Generate category-specific report
   * Requirement: 3.2
   */
  async generateCategoryReport(
    categories: string[],
    query: Omit<ReportQueryDto, 'categories'>,
    userId?: string,
  ): Promise<ReportData> {
    const reportQuery: ReportQueryDto = {
      ...query,
      categories,
      groupBy: 'category',
    };

    return this.generateReport(reportQuery, userId);
  }

  /**
   * Generate vendor-specific report
   * Requirement: 3.2
   */
  async generateVendorReport(
    vendors: string[],
    query: Omit<ReportQueryDto, 'vendors'>,
    userId?: string,
  ): Promise<ReportData> {
    const reportQuery: ReportQueryDto = {
      ...query,
      vendors,
      groupBy: 'vendor',
    };

    return this.generateReport(reportQuery, userId);
  }

  /**
   * Generate status-based report for workflow tracking
   */
  async generateStatusReport(
    statuses: ExpenseStatus[],
    query: Omit<ReportQueryDto, 'statuses'>,
    userId?: string,
  ): Promise<ReportData> {
    const reportQuery: ReportQueryDto = {
      ...query,
      statuses,
      groupBy: 'status',
    };

    return this.generateReport(reportQuery, userId);
  }

  /**
   * Generate time-based report (monthly, quarterly, yearly)
   */
  async generateTimeBasedReport(
    dateFrom: string,
    dateTo: string,
    groupBy: 'month' | 'quarter' | 'year',
    query: Omit<ReportQueryDto, 'dateFrom' | 'dateTo' | 'groupBy'>,
    userId?: string,
  ): Promise<ReportData> {
    const reportQuery: ReportQueryDto = {
      ...query,
      dateFrom,
      dateTo,
      groupBy: groupBy === 'quarter' || groupBy === 'year' ? 'month' : 'month', // Map to month for now
    };

    return this.generateReport(reportQuery, userId);
  }

  private buildFilterQuery(query: ReportQueryDto): FilterQuery<Expense> {
    const where: any = {};

    // Date range filtering
    if (query.dateFrom || query.dateTo) {
      where.transactionDate = {};
      if (query.dateFrom) {
        where.transactionDate.$gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.transactionDate.$lte = new Date(query.dateTo);
      }
    }

    // Category filtering
    if (query.categories && query.categories.length > 0) {
      where.category = { $in: query.categories };
    }

    // Vendor filtering
    if (query.vendors && query.vendors.length > 0) {
      where.vendor = { name: { $in: query.vendors } };
    }

    // Status filtering
    if (query.statuses && query.statuses.length > 0) {
      where.status = { $in: query.statuses };
    }

    // Currency filtering
    if (query.currency) {
      where.currency = query.currency;
    }

    // Payment method filtering
    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    // Submitter filtering
    if (query.submitterId) {
      where.submitter = query.submitterId;
    }

    // Payment ID filtering
    if (query.paymentId) {
      where.paymentId = { $ilike: `%${query.paymentId}%` };
    }

    // Expense month filtering
    if (query.expenseMonth) {
      where.expenseMonth = { $ilike: `%${query.expenseMonth}%` };
    }

    // Exclude soft-deleted records unless explicitly requested
    if (!query.includeDeleted) {
      where.deletedAt = null;
    }

    return where;
  }

  private buildOrderBy(query: ReportQueryDto): Record<string, QueryOrder> {
    const sortBy = query.sortBy || 'transactionDate';
    const sortOrder = (query.sortOrder || 'DESC') as QueryOrder;

    const orderByMap: Record<string, string> = {
      date: 'transactionDate',
      amount: 'amount',
      category: 'category',
      vendor: 'vendor.name',
      status: 'status',
    };

    const field = orderByMap[sortBy] || 'transactionDate';
    return { [field]: sortOrder };
  }

  private calculateSummary(expenses: Expense[]): ReportSummary {
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const totalAmountVND = expenses
      .filter((e) => e.currency === Currency.VND)
      .reduce((sum, expense) => sum + expense.amount, 0);

    const totalAmountUSD = expenses
      .filter((e) => e.currency === Currency.USD)
      .reduce((sum, expense) => sum + expense.amount, 0);

    const averageAmount = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    // Calculate status breakdown
    const statusBreakdown = expenses.reduce(
      (acc, expense) => {
        acc[expense.status] = (acc[expense.status] || 0) + 1;
        return acc;
      },
      {} as Record<ExpenseStatus, number>,
    );

    // Calculate date range
    const dates = expenses
      .map((e) => new Date(e.transactionDate))
      .sort((a, b) => a.getTime() - b.getTime());
    const dateRange = {
      from: dates[0] || new Date(),
      to: dates[dates.length - 1] || new Date(),
    };

    return {
      totalExpenses,
      totalAmount,
      totalAmountVND,
      totalAmountUSD,
      averageAmount,
      statusBreakdown,
      dateRange,
    };
  }

  private groupExpenses(
    expenses: Expense[],
    groupBy: string,
    totalAmount: number,
  ): GroupedReportData[] {
    const groups = new Map<string, Expense[]>();

    expenses.forEach((expense) => {
      let groupKey: string;

      switch (groupBy) {
        case 'category':
          groupKey = expense.category;
          break;
        case 'vendor':
          groupKey = expense.vendor.id;
          break;
        case 'status':
          groupKey = expense.status;
          break;
        case 'submitter':
          groupKey = expense.submitter.id;
          break;
        case 'month': {
          const date = new Date(expense.transactionDate);
          groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        }
        default:
          groupKey = 'other';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(expense);
    });

    return Array.from(groups.entries())
      .map(([groupKey, groupExpenses]) => {
        const groupAmount = groupExpenses.reduce(
          (sum, expense) => sum + expense.amount,
          0,
        );
        const groupLabel = groupExpenses[0]
          ? this.getGroupLabel(groupExpenses[0], groupBy)
          : groupKey;

        return {
          groupKey,
          groupLabel,
          expenses: groupExpenses,
          totalAmount: groupAmount,
          expenseCount: groupExpenses.length,
          percentage: totalAmount > 0 ? (groupAmount / totalAmount) * 100 : 0,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private getGroupLabel(expense: Expense, groupBy: string): string {
    switch (groupBy) {
      case 'category':
        return expense.category;
      case 'vendor':
        return expense.vendor.name;
      case 'status':
        return expense.status;
      case 'submitter':
        return expense.submitter.name;
      case 'month': {
        const date = new Date(expense.transactionDate);
        return `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      }
      default:
        return 'Other';
    }
  }
}
