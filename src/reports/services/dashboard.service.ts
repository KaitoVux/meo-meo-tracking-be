import { Injectable } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/core';
import {
  Expense,
  ExpenseStatus,
  Currency,
} from '../../entities/expense.entity';
import { DashboardQueryDto } from '../dto/dashboard-query.dto';

export interface DashboardStatistics {
  totalExpenses: number;
  totalAmount: number;
  totalAmountVND: number;
  totalAmountUSD: number;
  statusCounts: Record<ExpenseStatus, number>;
  monthlyTotals: MonthlyTotal[];
  quarterlyTotals: QuarterlyTotal[];
  yearlyTotals: YearlyTotal[];
  categoryBreakdown: CategoryBreakdown[];
  vendorBreakdown: VendorBreakdown[];
  recentExpenses: Expense[];
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  averageExpenseAmount: number;
  expensesBySubmitter: SubmitterBreakdown[];
}

export interface MonthlyTotal {
  month: string; // Format: "YYYY-MM"
  monthName: string; // Format: "January 2024"
  totalAmount: number;
  totalAmountVND: number;
  totalAmountUSD: number;
  expenseCount: number;
}

export interface QuarterlyTotal {
  quarter: string; // Format: "Q1 2024"
  year: number;
  quarterNumber: number;
  totalAmount: number;
  totalAmountVND: number;
  totalAmountUSD: number;
  expenseCount: number;
}

export interface YearlyTotal {
  year: number;
  totalAmount: number;
  totalAmountVND: number;
  totalAmountUSD: number;
  expenseCount: number;
}

export interface CategoryBreakdown {
  category: string;
  totalAmount: number;
  expenseCount: number;
  percentage: number;
}

export interface VendorBreakdown {
  vendorId: string;
  vendorName: string;
  totalAmount: number;
  expenseCount: number;
  percentage: number;
}

export interface PaymentMethodBreakdown {
  paymentMethod: string;
  totalAmount: number;
  expenseCount: number;
  percentage: number;
}

export interface SubmitterBreakdown {
  submitterId: string;
  submitterName: string;
  totalAmount: number;
  expenseCount: number;
  percentage: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Get comprehensive dashboard statistics
   * Requirements: 3.1, 3.2, 3.5, 3.6
   */
  async getDashboardStatistics(
    query: DashboardQueryDto,
  ): Promise<DashboardStatistics> {
    const where = this.buildFilterQuery(query);

    // Get all expenses for calculations
    const expenses = await this.em.find(Expense, where, {
      populate: ['submitter', 'vendor'],
      orderBy: { transactionDate: 'DESC' },
    });

    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    // Calculate currency-specific totals
    const totalAmountVND = expenses
      .filter((e) => e.currency === Currency.VND)
      .reduce((sum, expense) => sum + expense.amount, 0);

    const totalAmountUSD = expenses
      .filter((e) => e.currency === Currency.USD)
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate status counts
    const statusCounts = this.calculateStatusCounts(expenses);

    // Calculate time-based totals
    const monthlyTotals = this.calculateMonthlyTotals(expenses);
    const quarterlyTotals = this.calculateQuarterlyTotals(expenses);
    const yearlyTotals = this.calculateYearlyTotals(expenses);

    // Calculate breakdowns
    const categoryBreakdown = this.calculateCategoryBreakdown(
      expenses,
      totalAmount,
    );
    const vendorBreakdown = this.calculateVendorBreakdown(
      expenses,
      totalAmount,
    );
    const paymentMethodBreakdown = this.calculatePaymentMethodBreakdown(
      expenses,
      totalAmount,
    );
    const expensesBySubmitter = this.calculateSubmitterBreakdown(
      expenses,
      totalAmount,
    );

    // Get recent expenses (last 10)
    const recentExpenses = expenses.slice(0, 10);

    // Calculate average expense amount
    const averageExpenseAmount =
      totalExpenses > 0 ? totalAmount / totalExpenses : 0;

    return {
      totalExpenses,
      totalAmount,
      totalAmountVND,
      totalAmountUSD,
      statusCounts,
      monthlyTotals,
      quarterlyTotals,
      yearlyTotals,
      categoryBreakdown,
      vendorBreakdown,
      recentExpenses,
      paymentMethodBreakdown,
      averageExpenseAmount,
      expensesBySubmitter,
    };
  }

  /**
   * Get monthly statistics for a specific period
   * Requirement: 3.1
   */
  async getMonthlyStatistics(
    year: number,
    month?: number,
    query?: DashboardQueryDto,
  ): Promise<MonthlyTotal[]> {
    const where: any = this.buildFilterQuery(query || {});

    // Add year filter
    const startDate = new Date(year, month ? month - 1 : 0, 1);
    const endDate = month
      ? new Date(year, month, 0) // Last day of specific month
      : new Date(year + 1, 0, 0); // Last day of year

    where.transactionDate = {
      $gte: startDate,
      $lte: endDate,
    };

    const expenses = await this.em.find(Expense, where, {
      populate: ['vendor'],
    });

    return this.calculateMonthlyTotals(expenses);
  }

  /**
   * Get quarterly statistics for a specific year
   * Requirement: 3.1
   */
  async getQuarterlyStatistics(
    year: number,
    query?: DashboardQueryDto,
  ): Promise<QuarterlyTotal[]> {
    const where: any = this.buildFilterQuery(query || {});

    // Add year filter
    where.transactionDate = {
      $gte: new Date(year, 0, 1),
      $lte: new Date(year, 11, 31),
    };

    const expenses = await this.em.find(Expense, where);
    return this.calculateQuarterlyTotals(expenses);
  }

  /**
   * Get yearly statistics
   * Requirement: 3.1
   */
  async getYearlyStatistics(query?: DashboardQueryDto): Promise<YearlyTotal[]> {
    const where = this.buildFilterQuery(query || {});
    const expenses = await this.em.find(Expense, where);
    return this.calculateYearlyTotals(expenses);
  }

  private buildFilterQuery(query: DashboardQueryDto): FilterQuery<Expense> {
    const where: any = {};

    if (query.month) {
      // Handle both "YYYY-MM" and month name formats
      if (query.month.includes('-')) {
        const [year, month] = query.month.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        where.transactionDate = { $gte: startDate, $lte: endDate };
      } else {
        where.expenseMonth = { $ilike: `%${query.month}%` };
      }
    }

    if (query.vendor) {
      where.vendor = { name: { $ilike: `%${query.vendor}%` } };
    }

    if (query.category) {
      where.category = { $ilike: `%${query.category}%` };
    }

    if (query.currency) {
      where.currency = query.currency;
    }

    if (query.submitterId) {
      where.submitter = query.submitterId;
    }

    if (query.dateFrom || query.dateTo) {
      where.transactionDate = {};
      if (query.dateFrom) {
        where.transactionDate.$gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.transactionDate.$lte = new Date(query.dateTo);
      }
    }

    // Exclude soft-deleted records unless explicitly requested
    if (!query.includeDeleted) {
      where.deletedAt = null;
    }

    return where;
  }

  private calculateStatusCounts(
    expenses: Expense[],
  ): Record<ExpenseStatus, number> {
    const counts = {
      [ExpenseStatus.DRAFT]: 0,
      [ExpenseStatus.IN_PROGRESS]: 0,
      [ExpenseStatus.PAID]: 0,
      [ExpenseStatus.ON_HOLD]: 0,
    };

    expenses.forEach((expense) => {
      counts[expense.status]++;
    });

    return counts;
  }

  private calculateMonthlyTotals(expenses: Expense[]): MonthlyTotal[] {
    const monthlyMap = new Map<string, MonthlyTotal>();

    expenses.forEach((expense) => {
      const date = new Date(expense.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          monthName,
          totalAmount: 0,
          totalAmountVND: 0,
          totalAmountUSD: 0,
          expenseCount: 0,
        });
      }

      const monthly = monthlyMap.get(monthKey)!;
      monthly.totalAmount += expense.amount;
      monthly.expenseCount++;

      if (expense.currency === Currency.VND) {
        monthly.totalAmountVND += expense.amount;
      } else {
        monthly.totalAmountUSD += expense.amount;
      }
    });

    return Array.from(monthlyMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }

  private calculateQuarterlyTotals(expenses: Expense[]): QuarterlyTotal[] {
    const quarterlyMap = new Map<string, QuarterlyTotal>();

    expenses.forEach((expense) => {
      const date = new Date(expense.transactionDate);
      const year = date.getFullYear();
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const quarterKey = `Q${quarter} ${year}`;

      if (!quarterlyMap.has(quarterKey)) {
        quarterlyMap.set(quarterKey, {
          quarter: quarterKey,
          year,
          quarterNumber: quarter,
          totalAmount: 0,
          totalAmountVND: 0,
          totalAmountUSD: 0,
          expenseCount: 0,
        });
      }

      const quarterly = quarterlyMap.get(quarterKey)!;
      quarterly.totalAmount += expense.amount;
      quarterly.expenseCount++;

      if (expense.currency === Currency.VND) {
        quarterly.totalAmountVND += expense.amount;
      } else {
        quarterly.totalAmountUSD += expense.amount;
      }
    });

    return Array.from(quarterlyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.quarterNumber - b.quarterNumber;
    });
  }

  private calculateYearlyTotals(expenses: Expense[]): YearlyTotal[] {
    const yearlyMap = new Map<number, YearlyTotal>();

    expenses.forEach((expense) => {
      const year = new Date(expense.transactionDate).getFullYear();

      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, {
          year,
          totalAmount: 0,
          totalAmountVND: 0,
          totalAmountUSD: 0,
          expenseCount: 0,
        });
      }

      const yearly = yearlyMap.get(year)!;
      yearly.totalAmount += expense.amount;
      yearly.expenseCount++;

      if (expense.currency === Currency.VND) {
        yearly.totalAmountVND += expense.amount;
      } else {
        yearly.totalAmountUSD += expense.amount;
      }
    });

    return Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year);
  }

  private calculateCategoryBreakdown(
    expenses: Expense[],
    totalAmount: number,
  ): CategoryBreakdown[] {
    const categoryMap = new Map<string, { amount: number; count: number }>();

    expenses.forEach((expense) => {
      const category = expense.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { amount: 0, count: 0 });
      }
      const categoryData = categoryMap.get(category)!;
      categoryData.amount += expense.amount;
      categoryData.count++;
    });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        totalAmount: data.amount,
        expenseCount: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private calculateVendorBreakdown(
    expenses: Expense[],
    totalAmount: number,
  ): VendorBreakdown[] {
    const vendorMap = new Map<
      string,
      { amount: number; count: number; name: string }
    >();

    expenses.forEach((expense) => {
      const vendorId = expense.vendor.id;
      const vendorName = expense.vendor.name;

      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, { amount: 0, count: 0, name: vendorName });
      }
      const vendorData = vendorMap.get(vendorId)!;
      vendorData.amount += expense.amount;
      vendorData.count++;
    });

    return Array.from(vendorMap.entries())
      .map(([vendorId, data]) => ({
        vendorId,
        vendorName: data.name,
        totalAmount: data.amount,
        expenseCount: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private calculatePaymentMethodBreakdown(
    expenses: Expense[],
    totalAmount: number,
  ): PaymentMethodBreakdown[] {
    const methodMap = new Map<string, { amount: number; count: number }>();

    expenses.forEach((expense) => {
      const method = expense.paymentMethod;
      if (!methodMap.has(method)) {
        methodMap.set(method, { amount: 0, count: 0 });
      }
      const methodData = methodMap.get(method)!;
      methodData.amount += expense.amount;
      methodData.count++;
    });

    return Array.from(methodMap.entries())
      .map(([paymentMethod, data]) => ({
        paymentMethod,
        totalAmount: data.amount,
        expenseCount: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private calculateSubmitterBreakdown(
    expenses: Expense[],
    totalAmount: number,
  ): SubmitterBreakdown[] {
    const submitterMap = new Map<
      string,
      { amount: number; count: number; name: string }
    >();

    expenses.forEach((expense) => {
      const submitterId = expense.submitter.id;
      const submitterName = expense.submitter.name;

      if (!submitterMap.has(submitterId)) {
        submitterMap.set(submitterId, {
          amount: 0,
          count: 0,
          name: submitterName,
        });
      }
      const submitterData = submitterMap.get(submitterId)!;
      submitterData.amount += expense.amount;
      submitterData.count++;
    });

    return Array.from(submitterMap.entries())
      .map(([submitterId, data]) => ({
        submitterId,
        submitterName: data.name,
        totalAmount: data.amount,
        expenseCount: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }
}
