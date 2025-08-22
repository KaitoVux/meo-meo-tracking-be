import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
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

  // Define allowed status transitions (Requirements 2.1-2.5)
  private readonly allowedTransitions: StatusTransition[] = [
    {
      from: ExpenseStatus.DRAFT,
      to: ExpenseStatus.SUBMITTED,
      validationRequired: true,
    },
    { from: ExpenseStatus.SUBMITTED, to: ExpenseStatus.APPROVED },
    { from: ExpenseStatus.SUBMITTED, to: ExpenseStatus.DRAFT }, // Allow back to draft for corrections
    { from: ExpenseStatus.APPROVED, to: ExpenseStatus.PAID },
    { from: ExpenseStatus.APPROVED, to: ExpenseStatus.SUBMITTED }, // Allow back for corrections
    { from: ExpenseStatus.PAID, to: ExpenseStatus.CLOSED },
    { from: ExpenseStatus.PAID, to: ExpenseStatus.APPROVED }, // Allow back if payment was incorrect
  ];

  /**
   * Updates expense status with workflow validation
   * Requirements 2.1-2.5: Status workflow management
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

    // Additional validation for submission
    if (newStatus === ExpenseStatus.SUBMITTED) {
      this.validateExpenseForSubmission(expense);
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
   * Validates expense data before submission
   * Requirement 2.6: Notifications for missing fields
   */
  private validateExpenseForSubmission(expense: Expense): void {
    const missingFields: string[] = [];

    if (!expense.vendor) missingFields.push('Vendor');
    if (!expense.amount || expense.amount <= 0) missingFields.push('Amount');
    if (!expense.description) missingFields.push('Description');
    if (!expense.transactionDate) missingFields.push('Transaction Date');
    if (!expense.paymentMethod) missingFields.push('Payment method');

    if (missingFields.length > 0) {
      throw new BadRequestException({
        message: 'Cannot submit expense with missing required fields',
        missingFields,
      });
    }
  }

  /**
   * Handles actions after status transitions
   * Requirement 2.7: Reminder to collect invoice after payment
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

    // When status changes to SUBMITTED, validate completeness
    if (newStatus === ExpenseStatus.SUBMITTED) {
      console.log(`Expense ${expense.id} submitted for review`);
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
   */
  canUserTransitionStatus(
    userRole: string,
    currentStatus: ExpenseStatus,
    newStatus: ExpenseStatus,
  ): boolean {
    const transition = this.allowedTransitions.find(
      (t) => t.from === currentStatus && t.to === newStatus,
    );

    if (!transition) {
      return false;
    }

    // If no role restrictions, allow all users
    if (!transition.allowedRoles || transition.allowedRoles.length === 0) {
      return true;
    }

    return transition.allowedRoles.includes(userRole);
  }
}
