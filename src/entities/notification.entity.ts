import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Enum,
  Index,
} from '@mikro-orm/core';
import { v4 } from 'uuid';
import { User } from './user.entity';
import { Expense } from './expense.entity';

export enum NotificationType {
  MISSING_FIELDS = 'missing_fields',
  INVOICE_REMINDER = 'invoice_reminder',
  STATUS_CHANGE = 'status_change',
  VALIDATION_ERROR = 'validation_error',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  DISMISSED = 'dismissed',
}

@Entity()
@Index({ properties: ['recipient', 'status'] })
@Index({ properties: ['type', 'createdAt'] })
export class Notification {
  @PrimaryKey()
  id: string = v4();

  @Property()
  title: string;

  @Property({ type: 'text' })
  message: string;

  @Enum(() => NotificationType)
  type: NotificationType;

  @Enum(() => NotificationPriority)
  priority: NotificationPriority = NotificationPriority.MEDIUM;

  @Enum(() => NotificationStatus)
  status: NotificationStatus = NotificationStatus.UNREAD;

  @ManyToOne(() => User)
  recipient: User;

  @ManyToOne(() => Expense, { nullable: true })
  relatedExpense?: Expense;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  readAt?: Date;

  @Property({ nullable: true })
  dismissedAt?: Date;

  @Property({ default: false })
  isDeleted: boolean = false;

  constructor(
    title: string,
    message: string,
    type: NotificationType,
    recipient: User,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
  ) {
    this.title = title;
    this.message = message;
    this.type = type;
    this.recipient = recipient;
    this.priority = priority;
  }
}
