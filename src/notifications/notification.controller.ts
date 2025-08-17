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
    return this.notificationService.getUserNotifications(
      req.user.id,
      status,
      limit,
      offset,
    );
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return { count };
  }

  /**
   * Mark notification as read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    await this.notificationService.markAsRead(id, req.user.id);
    return { success: true };
  }

  /**
   * Dismiss notification
   */
  @Patch(':id/dismiss')
  async dismissNotification(@Param('id') id: string, @Request() req) {
    await this.notificationService.dismissNotification(id, req.user.id);
    return { success: true };
  }

  /**
   * Mark all notifications as read
   */
  @Patch('mark-all-read')
  async markAllAsRead(@Request() req) {
    await this.notificationService.markAllAsRead(req.user.id);
    return { success: true };
  }

  /**
   * Get daily digest (manual trigger for testing)
   */
  @Post('daily-digest')
  async getDailyDigest(@Request() req) {
    await this.reminderService.sendDailyDigest(req.user.id);
    return { success: true, message: 'Daily digest sent' };
  }

  /**
   * Trigger overdue reminders (admin only - for testing)
   */
  @Post('send-overdue-reminders')
  async sendOverdueReminders() {
    // In production, this would be restricted to admin users
    await this.reminderService.sendOverdueExpenseReminders();
    return { success: true, message: 'Overdue reminders sent' };
  }

  /**
   * Trigger incomplete submission reminders (admin only - for testing)
   */
  @Post('send-incomplete-reminders')
  async sendIncompleteReminders() {
    // In production, this would be restricted to admin users
    await this.reminderService.sendIncompleteSubmissionReminders();
    return { success: true, message: 'Incomplete submission reminders sent' };
  }
}
