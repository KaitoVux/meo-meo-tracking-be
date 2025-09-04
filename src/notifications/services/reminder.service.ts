import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { NotificationService } from './notification.service';
import { Expense, ExpenseStatus } from '../../entities/expense.entity';
import {
  NotificationPriority,
  NotificationType,
} from '../../entities/notification.entity';

@Injectable()
export class ReminderService {
  constructor(
    private readonly em: EntityManager,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Creates reminder for invoice collection after payment
   * Requirement 2.7: Reminder to collect invoice after payment
   */
  async createInvoiceCollectionReminder(expense: Expense): Promise<void> {
    if (expense.status !== ExpenseStatus.PAID) {
      return;
    }

    await this.notificationService.notifyInvoiceReminder(
      expense.submitter.id,
      expense.id,
      expense.paymentId,
    );

    // Schedule follow-up reminders if needed
    this.scheduleFollowUpReminders(expense);
  }

  /**
   * Schedules follow-up reminders for invoice collection
   */
  private scheduleFollowUpReminders(expense: Expense): void {
    // In a real implementation, this would use a job queue or scheduler
    // For now, we'll create immediate reminders with different priorities

    const reminderSchedule = [
      { days: 3, priority: NotificationPriority.MEDIUM },
      { days: 7, priority: NotificationPriority.HIGH },
      { days: 14, priority: NotificationPriority.URGENT },
    ];

    for (const reminder of reminderSchedule) {
      // This would typically be scheduled for future execution
      console.log(
        `Scheduled reminder for expense ${expense.paymentId} in ${reminder.days} days with priority ${reminder.priority}`,
      );
    }
  }

  /**
   * Sends reminders for overdue expenses
   */
  async sendOverdueExpenseReminders(): Promise<void> {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 30); // 30 days old

    const overdueExpenses = await this.em.find(
      Expense,
      {
        status: { $in: [ExpenseStatus.PAID] },
        updatedAt: { $lt: overdueDate },
      },
      {
        populate: ['submitter'],
      },
    );

    for (const expense of overdueExpenses) {
      await this.notificationService.createNotification({
        title: 'Overdue Invoice Collection',
        message: `Invoice collection is overdue for expense ${expense.paymentId}. Please upload the invoice immediately.`,
        type: NotificationType.INVOICE_REMINDER,
        priority: NotificationPriority.URGENT,
        recipientId: expense.submitter.id,
        relatedExpenseId: expense.id,
        metadata: {
          paymentId: expense.paymentId,
          daysPastDue: Math.floor(
            (new Date().getTime() - expense.updatedAt.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        },
      });
    }
  }

  /**
   * Sends reminders for incomplete expense submissions
   */
  async sendIncompleteSubmissionReminders(): Promise<void> {
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() - 7); // 7 days old

    const incompleteExpenses = await this.em.find(
      Expense,
      {
        status: ExpenseStatus.DRAFT,
        createdAt: { $lt: reminderDate },
      },
      {
        populate: ['submitter'],
      },
    );

    for (const expense of incompleteExpenses) {
      await this.notificationService.createNotification({
        title: 'Incomplete Expense Submission',
        message: `You have an incomplete expense entry (${expense.paymentId || 'Draft'}) that needs attention. Please complete and submit it.`,
        type: NotificationType.MISSING_FIELDS,
        priority: NotificationPriority.MEDIUM,
        recipientId: expense.submitter.id,
        relatedExpenseId: expense.id,
        metadata: {
          paymentId: expense.paymentId,
          daysInDraft: Math.floor(
            (new Date().getTime() - expense.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        },
      });
    }
  }

  /**
   * Sends daily digest of pending actions
   */
  async sendDailyDigest(userId: string): Promise<void> {
    const user = await this.em.findOne('User', { id: userId });
    if (!user) return;

    // Get user's expenses that need attention
    const pendingExpenses = await this.em.find(Expense, {
      submitter: userId,
      status: { $in: [ExpenseStatus.DRAFT, ExpenseStatus.PAID] },
    });

    if (pendingExpenses.length === 0) return;

    const draftCount = pendingExpenses.filter(
      (e) => e.status === ExpenseStatus.DRAFT,
    ).length;
    const paidAwaitingInvoice = pendingExpenses.filter(
      (e) => e.status === ExpenseStatus.PAID,
    ).length;

    let message = 'Daily expense summary:\n';
    if (draftCount > 0) {
      message += `• ${draftCount} draft expense(s) need completion\n`;
    }
    if (paidAwaitingInvoice > 0) {
      message += `• ${paidAwaitingInvoice} paid expense(s) need invoice collection\n`;
    }

    await this.notificationService.createNotification({
      title: 'Daily Expense Summary',
      message: message.trim(),
      type: NotificationType.STATUS_CHANGE,
      priority: NotificationPriority.LOW,
      recipientId: userId,
      metadata: {
        draftCount,
        paidAwaitingInvoice,
        totalPending: pendingExpenses.length,
      },
    });
  }

  /**
   * Creates reminder for missing payment request link
   */
  async createPaymentRequestReminder(expense: Expense): Promise<void> {
    if (expense.status === ExpenseStatus.IN_PROGRESS) {
      await this.notificationService.createNotification({
        title: 'Payment Request Link Missing',
        message: `Expense ${expense.paymentId} is approved but missing payment request link. Please add the payment request link.`,
        type: NotificationType.MISSING_FIELDS,
        priority: NotificationPriority.HIGH,
        recipientId: expense.submitter.id,
        relatedExpenseId: expense.id,
        metadata: {
          paymentId: expense.paymentId,
          missingField: 'paymentRequestLink',
        },
      });
    }
  }
}
