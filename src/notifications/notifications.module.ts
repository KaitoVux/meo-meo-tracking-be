import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { NotificationService } from './services/notification.service';
import { ValidationNotificationService } from './services/validation-notification.service';
import { ReminderService } from './services/reminder.service';
import { NotificationController } from './notification.controller';
import { Notification } from '../entities/notification.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Notification])],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    ValidationNotificationService,
    ReminderService,
  ],
  exports: [
    NotificationService,
    ValidationNotificationService,
    ReminderService,
  ],
})
export class NotificationsModule {}
