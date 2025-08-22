import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Expense } from '../../entities/expense.entity';
import { CreateNotificationDto } from '../dto/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Creates a new notification
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const recipient = await this.em.findOne(User, { id: dto.recipientId });
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    const notification = new Notification(
      dto.title,
      dto.message,
      dto.type,
      recipient,
      dto.priority,
    );

    if (dto.relatedExpenseId) {
      const expense = await this.em.findOne(Expense, {
        id: dto.relatedExpenseId,
      });
      if (expense) {
        notification.relatedExpense = expense;
      }
    }

    if (dto.metadata) {
      notification.metadata = dto.metadata;
    }

    this.em.persist(notification);
    await this.em.flush();

    return notification;
  }

  /**
   * Gets notifications for a user
   */
  async getUserNotifications(
    userId: string,
    status?: NotificationStatus,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const where: any = { recipient: userId };
    if (status) {
      where.status = status;
    }

    const [notifications, total] = await this.em.findAndCount(
      Notification,
      where,
      {
        populate: ['relatedExpense'],
        orderBy: { createdAt: 'DESC' },
        limit,
        offset,
      },
    );

    return { notifications, total };
  }

  /**
   * Marks a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.em.findOne(Notification, {
      id: notificationId,
      recipient: userId,
    });

    if (notification && notification.status === NotificationStatus.UNREAD) {
      notification.status = NotificationStatus.READ;
      notification.readAt = new Date();
      await this.em.flush();
    }
  }

  /**
   * Marks a notification as dismissed
   */
  async dismissNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const notification = await this.em.findOne(Notification, {
      id: notificationId,
      recipient: userId,
    });

    if (notification) {
      notification.status = NotificationStatus.DISMISSED;
      notification.dismissedAt = new Date();
      await this.em.flush();
    }
  }

  /**
   * Marks all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.em.nativeUpdate(
      Notification,
      {
        recipient: userId,
        status: NotificationStatus.UNREAD,
        deletedAt: null,
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    );
  }

  /**
   * Gets unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.em.count(Notification, {
      recipient: userId,
      status: NotificationStatus.UNREAD,
    });
  }

  /**
   * Deletes old notifications (soft delete)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.em.nativeUpdate(
      Notification,
      {
        createdAt: { $lt: cutoffDate },
        deletedAt: null,
      },
      {
        deletedAt: new Date(),
      },
    );

    return result;
  }

  /**
   * Creates a notification for missing fields
   */
  async notifyMissingFields(
    userId: string,
    expenseId: string,
    missingFields: string[],
  ): Promise<Notification> {
    const title = 'Missing Required Fields';
    const message = `The following required fields are missing: ${missingFields.join(', ')}. Please complete these fields before submitting.`;

    return this.createNotification({
      title,
      message,
      type: NotificationType.MISSING_FIELDS,
      priority: NotificationPriority.HIGH,
      recipientId: userId,
      relatedExpenseId: expenseId,
      metadata: { missingFields },
    });
  }

  /**
   * Creates a notification for invoice reminder
   */
  async notifyInvoiceReminder(
    userId: string,
    expenseId: string,
    paymentId: string,
  ): Promise<Notification> {
    const title = 'Invoice Collection Reminder';
    const message = `Payment has been processed for expense ${paymentId}. Please collect and upload the invoice.`;

    return this.createNotification({
      title,
      message,
      type: NotificationType.INVOICE_REMINDER,
      priority: NotificationPriority.MEDIUM,
      recipientId: userId,
      relatedExpenseId: expenseId,
      metadata: { paymentId },
    });
  }

  /**
   * Creates a notification for status change
   */
  async notifyStatusChange(
    userId: string,
    expenseId: string,
    fromStatus: string,
    toStatus: string,
  ): Promise<Notification> {
    const title = 'Expense Status Updated';
    const message = `Expense status changed from ${fromStatus} to ${toStatus}.`;

    return this.createNotification({
      title,
      message,
      type: NotificationType.STATUS_CHANGE,
      priority: NotificationPriority.LOW,
      recipientId: userId,
      relatedExpenseId: expenseId,
      metadata: { fromStatus, toStatus },
    });
  }
}
