import { Injectable } from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  ExpenseValidationService,
  ValidationResult,
} from '../../expenses/services/expense-validation.service';
import { Expense, ExpenseStatus } from '../../entities/expense.entity';
import {
  NotificationPriority,
  NotificationType,
} from '../../entities/notification.entity';

@Injectable()
export class ValidationNotificationService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly validationService: ExpenseValidationService,
  ) {}

  /**
   * Validates expense and sends notifications for missing fields
   * Requirement 2.6: Notifications for missing required fields
   */
  async validateAndNotify(expense: Expense): Promise<ValidationResult> {
    const validationResult =
      this.validationService.validateExpenseSubmission(expense);

    if (
      !validationResult.isValid &&
      validationResult.missingFields.length > 0
    ) {
      await this.notificationService.notifyMissingFields(
        expense.submitter.id,
        expense.id,
        validationResult.missingFields,
      );

      // Also notify accountants if expense is in submitted status
      if (expense.status === ExpenseStatus.SUBMITTED) {
        this.notifyAccountantsOfValidationIssues(
          expense,
          validationResult.missingFields,
        );
      }
    }

    return validationResult;
  }

  /**
   * Sends validation notifications to accountants
   */
  private notifyAccountantsOfValidationIssues(
    expense: Expense,
    missingFields: string[],
  ): void {
    // This would typically query for users with accountant role
    // For now, we'll create a placeholder implementation
    const message = `Expense ${expense.paymentId} has validation issues. Missing fields: ${missingFields.join(', ')}`;

    // In a real implementation, you would:
    // 1. Query for users with 'accountant' role
    // 2. Send notification to each accountant
    console.log(`Notification for accountants: ${message}`);
  }

  /**
   * Validates expense completeness before status transitions
   */
  async validateExpenseCompleteness(expense: Expense): Promise<{
    isComplete: boolean;
    missingFields: string[];
    criticalFields: string[];
  }> {
    const validationResult =
      this.validationService.validateExpenseSubmission(expense);

    // Define critical fields that must be present
    const criticalFields = ['vendor', 'amount', 'description', 'date'];
    const missingCriticalFields = validationResult.missingFields.filter(
      (field) =>
        criticalFields.some((critical) =>
          field.toLowerCase().includes(critical.toLowerCase()),
        ),
    );

    // Send high priority notifications for critical missing fields
    if (missingCriticalFields.length > 0) {
      await this.notificationService.createNotification({
        title: 'Critical Fields Missing',
        message: `Critical expense fields are missing: ${missingCriticalFields.join(', ')}. These must be completed before proceeding.`,
        type: NotificationType.VALIDATION_ERROR,
        priority: NotificationPriority.URGENT,
        recipientId: expense.submitter.id,
        relatedExpenseId: expense.id,
        metadata: {
          missingFields: validationResult.missingFields,
          criticalFields: missingCriticalFields,
        },
      });
    }

    return {
      isComplete: validationResult.isValid,
      missingFields: validationResult.missingFields,
      criticalFields: missingCriticalFields,
    };
  }

  /**
   * Validates expense data and provides detailed feedback
   */
  async validateExpenseWithFeedback(expense: Expense): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    const validationResult =
      this.validationService.validateExpenseSubmission(expense);
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for potential issues that aren't errors but could be improved
    if (expense.description && expense.description.length < 10) {
      warnings.push('Description is very short. Consider adding more details.');
      suggestions.push(
        'Add more descriptive information about the expense purpose.',
      );
    }

    if (expense.amount && expense.amount > 10000000) {
      // 10M VND
      warnings.push('Large expense amount detected.');
      suggestions.push(
        'Ensure proper approval workflow for high-value expenses.',
      );
    }

    // Note: File relationship would need to be properly set up in the expense entity
    // For now, we'll comment this out to avoid build errors
    // if (!expense.files || expense.files.length === 0) {
    //   warnings.push('No invoice files attached.');
    //   suggestions.push(
    //     'Upload invoice or receipt files for better record keeping.',
    //   );
    // }

    // Send notification if there are warnings
    if (warnings.length > 0) {
      await this.notificationService.createNotification({
        title: 'Expense Review Suggestions',
        message: `Your expense has some suggestions for improvement: ${suggestions.join(' ')}`,
        type: NotificationType.VALIDATION_ERROR,
        priority: NotificationPriority.LOW,
        recipientId: expense.submitter.id,
        relatedExpenseId: expense.id,
        metadata: {
          warnings,
          suggestions,
        },
      });
    }

    return {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings,
      suggestions,
    };
  }
}
