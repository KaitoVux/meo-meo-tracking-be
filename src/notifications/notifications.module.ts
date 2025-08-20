import { Module, forwardRef } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { NotificationService } from './services/notification.service';
import { ValidationNotificationService } from './services/validation-notification.service';
import { ReminderService } from './services/reminder.service';
import { NotificationController } from './notification.controller';
import { Notification } from '../entities/notification.entity';
import { ExpenseModule } from '../expenses/expense.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification]),
    forwardRef(() => ExpenseModule),
  ],
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
