import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './services/notification.service';
import { ReminderService } from './services/reminder.service';
import { NotificationStatus } from '../entities/notification.entity';
import { ResponseHelper } from '../common/decorators/api-response.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly reminderService: ReminderService,
  ) {}

  /**
   * Get user's notifications
   */
  @Get()
  async getUserNotifications(
    @Request() req,
    @Query('status') status?: NotificationStatus,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    const result = await this.notificationService.getUserNotifications(
      req.user.id,
      status,
      limit,
      offset,
    );

    // Check if result has pagination structure
    if (result && typeof result === 'object' && 'total' in result) {
      const data =
        'data' in result
          ? result.data
          : 'notifications' in result
            ? (result as any).notifications
            : result;
      const total = (result as any).total;

      return ResponseHelper.paginated(data, {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    }
    return ResponseHelper.success(result);
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return ResponseHelper.success({ count });
  }

  /**
   * Mark notification as read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    await this.notificationService.markAsRead(id, req.user.id);
    return ResponseHelper.success(null, 'Notification marked as read');
  }

  /**
   * Dismiss notification
   */
  @Patch(':id/dismiss')
  async dismissNotification(@Param('id') id: string, @Request() req) {
    await this.notificationService.dismissNotification(id, req.user.id);
    return ResponseHelper.success(null, 'Notification dismissed');
  }

  /**
   * Mark all notifications as read
   */
  @Patch('mark-all-read')
  async markAllAsRead(@Request() req) {
    await this.notificationService.markAllAsRead(req.user.id);
    return ResponseHelper.success(null, 'All notifications marked as read');
  }

  /**
   * Get daily digest (manual trigger for testing)
   */
  @Post('daily-digest')
  async getDailyDigest(@Request() req) {
    await this.reminderService.sendDailyDigest(req.user.id);
    return ResponseHelper.success(null, 'Daily digest sent');
  }

  /**
   * Trigger overdue reminders (admin only - for testing)
   */
  @Post('send-overdue-reminders')
  async sendOverdueReminders() {
    // In production, this would be restricted to admin users
    await this.reminderService.sendOverdueExpenseReminders();
    return ResponseHelper.success(null, 'Overdue reminders sent');
  }

  /**
   * Trigger incomplete submission reminders (admin only - for testing)
   */
  @Post('send-incomplete-reminders')
  async sendIncompleteReminders() {
    // In production, this would be restricted to admin users
    await this.reminderService.sendIncompleteSubmissionReminders();
    return ResponseHelper.success(null, 'Incomplete submission reminders sent');
  }
}
