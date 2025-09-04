import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Expense, ExpenseStatus } from '../../entities/expense.entity';
import { ExpenseStatusHistory } from '../../entities/expense-status-history.entity';
import { User } from '../../entities/user.entity';
import { NotificationService } from '../../notifications/services/notification.service';
import { ReminderService } from '../../notifications/services/reminder.service';

export interface StatusTransition {
  from: ExpenseStatus;
  to: ExpenseStatus;
  allowedRoles?: string[];
  validationRequired?: boolean;
}

@Injectable()
export class ExpenseWorkflowService {
  constructor(
    private readonly em: EntityManager,
    private readonly notificationService: NotificationService,
    private readonly reminderService: ReminderService,
  ) {}

  // Define allowed status transitions - simplified with full flexibility except PAID
  private readonly allowedTransitions: StatusTransition[] = [
    // From DRAFT
    { from: ExpenseStatus.DRAFT, to: ExpenseStatus.IN_PROGRESS },
    { from: ExpenseStatus.DRAFT, to: ExpenseStatus.ON_HOLD },

    // From IN_PROGRESS
    { from: ExpenseStatus.IN_PROGRESS, to: ExpenseStatus.DRAFT },
    { from: ExpenseStatus.IN_PROGRESS, to: ExpenseStatus.PAID },
    { from: ExpenseStatus.IN_PROGRESS, to: ExpenseStatus.ON_HOLD },

    // From ON_HOLD (can resume to any active status)
    { from: ExpenseStatus.ON_HOLD, to: ExpenseStatus.DRAFT },
    { from: ExpenseStatus.ON_HOLD, to: ExpenseStatus.IN_PROGRESS },

    // PAID is final - no transitions allowed
  ];

  /**
   * Updates expense status with workflow validation
   */
  async updateExpenseStatus(
    expenseId: string,
    newStatus: ExpenseStatus,
    userId: string,
    notes?: string,
  ): Promise<Expense> {
    const expense = await this.em.findOne(
      Expense,
      { id: expenseId },
      {
        populate: ['submitter', 'statusHistory'],
      },
    );

    if (!expense) {
      throw new BadRequestException('Expense not found');
    }

    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Validate status transition
    this.validateStatusTransition(expense.status, newStatus);

    // Additional validation for moving to IN_PROGRESS
    if (newStatus === ExpenseStatus.IN_PROGRESS) {
      this.validateExpenseForProcessing(expense);
    }

    const oldStatus = expense.status;
    expense.status = newStatus;
    expense.updatedAt = new Date();

    // Create status history record
    const statusHistory = new ExpenseStatusHistory();
    statusHistory.expense = expense;
    statusHistory.fromStatus = oldStatus;
    statusHistory.toStatus = newStatus;
    statusHistory.changedBy = user;
    statusHistory.notes = notes;
    statusHistory.createdAt = new Date();

    this.em.persist(statusHistory);
    await this.em.flush();

    // Handle post-transition actions
    await this.handlePostTransitionActions(expense, oldStatus, newStatus);

    return expense;
  }

  /**
   * Validates if status transition is allowed
   */
  private validateStatusTransition(
    currentStatus: ExpenseStatus,
    newStatus: ExpenseStatus,
  ): void {
    if (currentStatus === newStatus) {
      throw new BadRequestException(
        'Expense is already in the requested status',
      );
    }

    // PAID is final state - no transitions allowed
    if (currentStatus === ExpenseStatus.PAID) {
      throw new BadRequestException('Cannot change status of paid expenses');
    }

    const allowedTransition = this.allowedTransitions.find(
      (transition) =>
        transition.from === currentStatus && transition.to === newStatus,
    );

    if (!allowedTransition) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Validates expense data before moving to IN_PROGRESS
   */
  private validateExpenseForProcessing(expense: Expense): void {
    const missingFields: string[] = [];

    if (!expense.vendor) missingFields.push('Vendor');
    if (!expense.amount || expense.amount <= 0) missingFields.push('Amount');
    if (!expense.description) missingFields.push('Description');
    if (!expense.transactionDate) missingFields.push('Transaction Date');
    if (!expense.paymentMethod) missingFields.push('Payment method');

    if (missingFields.length > 0) {
      throw new BadRequestException({
        message:
          'Cannot move expense to processing with missing required fields',
        missingFields,
      });
    }
  }

  /**
   * Handles actions after status transitions
   */
  private async handlePostTransitionActions(
    expense: Expense,
    oldStatus: ExpenseStatus,
    newStatus: ExpenseStatus,
  ): Promise<void> {
    // When status changes to PAID, create reminder for invoice collection
    if (newStatus === ExpenseStatus.PAID && this.reminderService) {
      try {
        await this.reminderService.createInvoiceCollectionReminder(expense);
      } catch (error) {
        console.error('Failed to create invoice reminder:', error);
      }
    }

    // When status changes to IN_PROGRESS, log processing start
    if (newStatus === ExpenseStatus.IN_PROGRESS) {
      console.log(`Expense ${expense.id} moved to processing`);
    }

    // Notify about status change
    if (this.notificationService) {
      try {
        await this.notificationService.notifyStatusChange(
          expense.submitter.id,
          expense.id,
          oldStatus,
          newStatus,
        );
      } catch (error) {
        console.error('Failed to send status change notification:', error);
      }
    }
  }

  /**
   * Gets available status transitions for an expense
   */
  getAvailableTransitions(currentStatus: ExpenseStatus): ExpenseStatus[] {
    // PAID expenses cannot transition
    if (currentStatus === ExpenseStatus.PAID) {
      return [];
    }

    return this.allowedTransitions
      .filter((transition) => transition.from === currentStatus)
      .map((transition) => transition.to);
  }

  /**
   * Gets expense status history
   */
  async getExpenseStatusHistory(
    expenseId: string,
  ): Promise<ExpenseStatusHistory[]> {
    return this.em.find(
      ExpenseStatusHistory,
      { expense: expenseId },
      {
        populate: ['changedBy'],
        orderBy: { createdAt: 'DESC' },
      },
    );
  }

  /**
   * Checks if user can perform status transition
   * Note: With approval removal, all users can transition (subject to business rules)
   */
  canUserTransitionStatus(
    userRole: string,
    currentStatus: ExpenseStatus,
    newStatus: ExpenseStatus,
  ): boolean {
    // PAID expenses cannot transition
    if (currentStatus === ExpenseStatus.PAID) {
      return false;
    }

    const transition = this.allowedTransitions.find(
      (t) => t.from === currentStatus && t.to === newStatus,
    );

    return !!transition;
  }
}
