import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsObject,
} from 'class-validator';
import {
  NotificationType,
  NotificationPriority,
} from '../../entities/notification.entity';

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority = NotificationPriority.MEDIUM;

  @IsUUID()
  recipientId: string;

  @IsUUID()
  @IsOptional()
  relatedExpenseId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
