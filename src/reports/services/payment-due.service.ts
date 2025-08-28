import { Injectable } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { Expense, ExpenseStatus } from '../../entities/expense.entity';

export interface PaymentDueItem {
  expense: Expense;
  daysOverdue: number;
  isOverdue: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface PaymentDueReport {
  weeklyDue: PaymentDueItem[];
  monthlyDue: PaymentDueItem[];
  overdue: PaymentDueItem[];
  summary: PaymentDueSummary;
}

export interface PaymentDueSummary {
  totalDueThisWeek: number;
  totalDueThisMonth: number;
  totalOverdue: number;
  countDueThisWeek: number;
  countDueThisMonth: number;
  countOverdue: number;
  averageDaysToPayment: number;
}

@Injectable()
export class PaymentDueService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Get comprehensive payment due report
   * Requirements: 3.3, 3.4 - Payment due tracking weekly and monthly
   */
  async getPaymentDueReport(userId?: string): Promise<PaymentDueReport> {
    const now = new Date();

    // Get approved expenses that need payment
    const where: FilterQuery<Expense> = {
      status: ExpenseStatus.APPROVED,
      deletedAt: null,
    };

    if (userId) {
      where.submitter = userId;
    }

    const approvedExpenses = await this.em.find(Expense, where, {
      populate: ['submitter', 'vendor'],
      orderBy: { transactionDate: 'ASC' },
    });

    // Calculate payment due items
    const paymentDueItems = approvedExpenses.map((expense) =>
      this.calculatePaymentDueItem(expense, now),
    );

    // Filter by time periods
    const weeklyDue = paymentDueItems.filter(
      (item) =>
        !item.isOverdue &&
        this.isWithinDays(item.expense.transactionDate, now, 7),
    );

    const monthlyDue = paymentDueItems.filter(
      (item) =>
        !item.isOverdue &&
        this.isWithinDays(item.expense.transactionDate, now, 30),
    );

    const overdue = paymentDueItems.filter((item) => item.isOverdue);

    // Calculate summary
    const summary = this.calculatePaymentDueSummary(
      weeklyDue,
      monthlyDue,
      overdue,
    );

    return {
      weeklyDue,
      monthlyDue,
      overdue,
      summary,
    };
  }

  /**
   * Get payments due this week
   * Requirement: 3.3
   */
  async getWeeklyPaymentsDue(userId?: string): Promise<PaymentDueItem[]> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const where: FilterQuery<Expense> = {
      status: ExpenseStatus.APPROVED,
      transactionDate: { $gte: weekAgo, $lte: now },
      deletedAt: null,
    };

    if (userId) {
      where.submitter = userId;
    }

    const expenses = await this.em.find(Expense, where, {
      populate: ['submitter', 'vendor'],
      orderBy: { transactionDate: 'ASC' },
    });

    return expenses.map((expense) =>
      this.calculatePaymentDueItem(expense, now),
    );
  }

  /**
   * Get payments due this month
   * Requirement: 3.3
   */
  async getMonthlyPaymentsDue(userId?: string): Promise<PaymentDueItem[]> {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where: FilterQuery<Expense> = {
      status: ExpenseStatus.APPROVED,
      transactionDate: { $gte: monthAgo, $lte: now },
      deletedAt: null,
    };

    if (userId) {
      where.submitter = userId;
    }

    const expenses = await this.em.find(Expense, where, {
      populate: ['submitter', 'vendor'],
      orderBy: { transactionDate: 'ASC' },
    });

    return expenses.map((expense) =>
      this.calculatePaymentDueItem(expense, now),
    );
  }
  /**
   * Get overdue payments
   */
  async getOverduePayments(userId?: string): Promise<PaymentDueItem[]> {
    const now = new Date();
    // Consider payments overdue if approved more than 30 days ago
    const overdueDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where: FilterQuery<Expense> = {
      status: ExpenseStatus.APPROVED,
      transactionDate: { $lt: overdueDate },
      deletedAt: null,
    };

    if (userId) {
      where.submitter = userId;
    }

    const expenses = await this.em.find(Expense, where, {
      populate: ['submitter', 'vendor'],
      orderBy: { transactionDate: 'ASC' },
    });

    return expenses.map((expense) =>
      this.calculatePaymentDueItem(expense, now),
    );
  }

  /**
   * Get payment statistics for a specific period
   */
  async getPaymentStatistics(
    dateFrom: Date,
    dateTo: Date,
    userId?: string,
  ): Promise<{
    totalApproved: number;
    totalPaid: number;
    totalPending: number;
    averagePaymentTime: number;
  }> {
    const where: FilterQuery<Expense> = {
      transactionDate: { $gte: dateFrom, $lte: dateTo },
      deletedAt: null,
    };

    if (userId) {
      where.submitter = userId;
    }

    const expenses = await this.em.find(Expense, where, {
      populate: ['statusHistory'],
    });

    const approved = expenses.filter((e) =>
      [
        ExpenseStatus.APPROVED,
        ExpenseStatus.PAID,
        ExpenseStatus.CLOSED,
      ].includes(e.status),
    );
    const paid = expenses.filter((e) =>
      [ExpenseStatus.PAID, ExpenseStatus.CLOSED].includes(e.status),
    );
    const pending = expenses.filter((e) => e.status === ExpenseStatus.APPROVED);

    // Calculate average payment time (from approved to paid)
    const paymentTimes = paid
      .map((expense) => this.calculatePaymentTime(expense))
      .filter((time) => time > 0);

    const averagePaymentTime =
      paymentTimes.length > 0
        ? paymentTimes.reduce((sum, time) => sum + time, 0) /
          paymentTimes.length
        : 0;

    return {
      totalApproved: approved.reduce((sum, e) => sum + e.amount, 0),
      totalPaid: paid.reduce((sum, e) => sum + e.amount, 0),
      totalPending: pending.reduce((sum, e) => sum + e.amount, 0),
      averagePaymentTime,
    };
  }

  private calculatePaymentDueItem(
    expense: Expense,
    currentDate: Date,
  ): PaymentDueItem {
    const transactionDate = new Date(expense.transactionDate);
    const daysDiff = Math.floor(
      (currentDate.getTime() - transactionDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // Consider overdue if more than 30 days since transaction
    const isOverdue = daysDiff > 30;
    const daysOverdue = isOverdue ? daysDiff - 30 : 0;

    // Determine priority based on days overdue or days since transaction
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (isOverdue) {
      if (daysOverdue > 60) priority = 'CRITICAL';
      else if (daysOverdue > 30) priority = 'HIGH';
      else priority = 'MEDIUM';
    } else {
      if (daysDiff > 20) priority = 'MEDIUM';
      else priority = 'LOW';
    }

    return {
      expense,
      daysOverdue,
      isOverdue,
      priority,
    };
  }

  private isWithinDays(date: Date, referenceDate: Date, days: number): boolean {
    const diffTime = referenceDate.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= days;
  }
  private calculatePaymentDueSummary(
    weeklyDue: PaymentDueItem[],
    monthlyDue: PaymentDueItem[],
    overdue: PaymentDueItem[],
  ): PaymentDueSummary {
    const totalDueThisWeek = weeklyDue.reduce(
      (sum, item) => sum + item.expense.amount,
      0,
    );
    const totalDueThisMonth = monthlyDue.reduce(
      (sum, item) => sum + item.expense.amount,
      0,
    );
    const totalOverdue = overdue.reduce(
      (sum, item) => sum + item.expense.amount,
      0,
    );

    const countDueThisWeek = weeklyDue.length;
    const countDueThisMonth = monthlyDue.length;
    const countOverdue = overdue.length;

    // Calculate average days to payment from all items
    const allItems = [...weeklyDue, ...monthlyDue, ...overdue];
    const totalDays = allItems.reduce((sum, item) => {
      const daysSinceTransaction = Math.floor(
        (new Date().getTime() - item.expense.transactionDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return sum + daysSinceTransaction;
    }, 0);

    const averageDaysToPayment =
      allItems.length > 0 ? totalDays / allItems.length : 0;

    return {
      totalDueThisWeek,
      totalDueThisMonth,
      totalOverdue,
      countDueThisWeek,
      countDueThisMonth,
      countOverdue,
      averageDaysToPayment,
    };
  }

  private calculatePaymentTime(expense: Expense): number {
    // This would require status history to calculate actual payment time
    // For now, return a placeholder calculation
    const statusHistory = expense.statusHistory?.getItems() || [];

    const approvedHistory = statusHistory.find(
      (h) => h.toStatus === ExpenseStatus.APPROVED,
    );
    const paidHistory = statusHistory.find(
      (h) => h.toStatus === ExpenseStatus.PAID,
    );

    if (approvedHistory && paidHistory) {
      const approvedDate = new Date(approvedHistory.createdAt);
      const paidDate = new Date(paidHistory.createdAt);
      return Math.floor(
        (paidDate.getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    return 0;
  }
}
