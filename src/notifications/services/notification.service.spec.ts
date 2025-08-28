import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
import { NotificationService } from './notification.service';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Expense } from '../../entities/expense.entity';

describe('NotificationService', () => {
  let service: NotificationService;
  let em: jest.Mocked<EntityManager>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  } as User;

  const mockExpense = {
    id: 'expense-1',
    paymentId: 'PAY-001',
    submitter: mockUser,
  } as Expense;

  beforeEach(async () => {
    const mockEntityManager = {
      findOne: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      nativeUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    em = module.get(EntityManager);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      em.findOne.mockResolvedValue(mockUser);
      em.flush.mockResolvedValue();

      const dto = {
        title: 'Test Notification',
        message: 'Test message',
        type: NotificationType.MISSING_FIELDS,
        priority: NotificationPriority.HIGH,
        recipientId: 'user-1',
      };

      const result = await service.createNotification(dto);

      expect(result).toBeInstanceOf(Notification);
      expect(result.title).toBe(dto.title);
      expect(result.message).toBe(dto.message);
      expect(result.type).toBe(dto.type);
      expect(em.persist).toHaveBeenCalled();
      expect(em.flush).toHaveBeenCalled();
    });

    it('should throw error if recipient not found', async () => {
      em.findOne.mockResolvedValue(null);

      const dto = {
        title: 'Test Notification',
        message: 'Test message',
        type: NotificationType.MISSING_FIELDS,
        recipientId: 'invalid-user',
      };

      await expect(service.createNotification(dto)).rejects.toThrow(
        'Recipient not found',
      );
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const mockNotifications = [
        new Notification(
          'Title 1',
          'Message 1',
          NotificationType.MISSING_FIELDS,
          mockUser,
        ),
        new Notification(
          'Title 2',
          'Message 2',
          NotificationType.INVOICE_REMINDER,
          mockUser,
        ),
      ];

      em.findAndCount.mockResolvedValue([mockNotifications, 2]);

      const result = await service.getUserNotifications('user-1');

      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(em.findAndCount).toHaveBeenCalledWith(
        Notification,
        { recipient: 'user-1' },
        expect.objectContaining({
          populate: ['relatedExpense'],
          orderBy: { createdAt: 'DESC' },
          limit: 50,
          offset: 0,
        }),
      );
    });
  });

  describe('notifyMissingFields', () => {
    it('should create missing fields notification', async () => {
      em.findOne.mockResolvedValue(mockUser);
      em.flush.mockResolvedValue();

      const missingFields = ['vendor', 'amount'];
      const result = await service.notifyMissingFields(
        'user-1',
        'expense-1',
        missingFields,
      );

      expect(result.type).toBe(NotificationType.MISSING_FIELDS);
      expect(result.priority).toBe(NotificationPriority.HIGH);
      expect(result.message).toContain('vendor, amount');
      expect(result.metadata).toEqual({ missingFields });
    });
  });

  describe('notifyInvoiceReminder', () => {
    it('should create invoice reminder notification', async () => {
      em.findOne.mockResolvedValue(mockUser);
      em.flush.mockResolvedValue();

      const result = await service.notifyInvoiceReminder(
        'user-1',
        'expense-1',
        'PAY-001',
      );

      expect(result.type).toBe(NotificationType.INVOICE_REMINDER);
      expect(result.priority).toBe(NotificationPriority.MEDIUM);
      expect(result.message).toContain('PAY-001');
      expect(result.metadata).toEqual({ paymentId: 'PAY-001' });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      em.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(5);
      expect(em.count).toHaveBeenCalledWith(Notification, {
        recipient: 'user-1',
        status: NotificationStatus.UNREAD,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = new Notification(
        'Title',
        'Message',
        NotificationType.MISSING_FIELDS,
        mockUser,
      );
      mockNotification.status = 'unread' as any;

      em.findOne.mockResolvedValue(mockNotification);
      em.flush.mockResolvedValue();

      await service.markAsRead('notification-1', 'user-1');

      expect(mockNotification.status).toBe('read');
      expect(mockNotification.readAt).toBeInstanceOf(Date);
      expect(em.flush).toHaveBeenCalled();
    });
  });
});
