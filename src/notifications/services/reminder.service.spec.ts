import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
import { ReminderService } from './reminder.service';
import { NotificationService } from './notification.service';
import { Expense, ExpenseStatus } from '../../entities/expense.entity';
import { User } from '../../entities/user.entity';

describe('ReminderService', () => {
  let service: ReminderService;
  let em: jest.Mocked<EntityManager>;
  let notificationService: jest.Mocked<NotificationService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  } as User;

  const mockExpense = {
    id: 'expense-1',
    paymentId: 'PAY-001',
    submitter: mockUser,
    status: ExpenseStatus.PAID,
    updatedAt: new Date(),
  } as Expense;

  beforeEach(async () => {
    const mockEntityManager = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockNotificationService = {
      notifyInvoiceReminder: jest.fn(),
      createNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderService,
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<ReminderService>(ReminderService);
    em = module.get(EntityManager);
    notificationService = module.get(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvoiceCollectionReminder', () => {
    it('should create reminder for paid expense', async () => {
      notificationService.notifyInvoiceReminder.mockResolvedValue({} as any);

      await service.createInvoiceCollectionReminder(mockExpense);

      expect(notificationService.notifyInvoiceReminder).toHaveBeenCalledWith(
        mockExpense.submitter.id,
        mockExpense.id,
        mockExpense.paymentId,
      );
    });

    it('should not create reminder for non-paid expense', async () => {
      const draftExpense = { ...mockExpense, status: ExpenseStatus.DRAFT };

      await service.createInvoiceCollectionReminder(draftExpense);

      expect(notificationService.notifyInvoiceReminder).not.toHaveBeenCalled();
    });
  });

  describe('sendOverdueExpenseReminders', () => {
    it('should send reminders for overdue expenses', async () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 35); // 35 days old

      const overdueExpense = {
        ...mockExpense,
        updatedAt: overdueDate,
      };

      em.find.mockResolvedValue([overdueExpense]);
      notificationService.createNotification.mockResolvedValue({} as any);

      await service.sendOverdueExpenseReminders();

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        expect.objectContaining({
          status: { $in: [ExpenseStatus.PAID] },
        }),
        expect.objectContaining({
          populate: ['submitter'],
        }),
      );

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Overdue Invoice Collection',
          type: 'invoice_reminder',
          priority: 'urgent',
          recipientId: mockUser.id,
        }),
      );
    });
  });

  describe('sendIncompleteSubmissionReminders', () => {
    it('should send reminders for old draft expenses', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days old

      const draftExpense = {
        ...mockExpense,
        status: ExpenseStatus.DRAFT,
        createdAt: oldDate,
      };

      em.find.mockResolvedValue([draftExpense]);
      notificationService.createNotification.mockResolvedValue({} as any);

      await service.sendIncompleteSubmissionReminders();

      expect(em.find).toHaveBeenCalledWith(
        Expense,
        expect.objectContaining({
          status: ExpenseStatus.DRAFT,
        }),
        expect.objectContaining({
          populate: ['submitter'],
        }),
      );

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Incomplete Expense Submission',
          type: 'missing_fields',
          priority: 'medium',
          recipientId: mockUser.id,
        }),
      );
    });
  });

  describe('sendDailyDigest', () => {
    it('should send daily digest with pending actions', async () => {
      const draftExpense = { ...mockExpense, status: ExpenseStatus.DRAFT };
      const paidExpense = { ...mockExpense, status: ExpenseStatus.PAID };

      em.findOne.mockResolvedValue(mockUser);
      em.find.mockResolvedValue([draftExpense, paidExpense]);
      notificationService.createNotification.mockResolvedValue({} as any);

      await service.sendDailyDigest('user-1');

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Daily Expense Summary',
          type: 'status_change',
          priority: 'low',
          recipientId: 'user-1',
          metadata: expect.objectContaining({
            draftCount: 1,
            paidAwaitingInvoice: 1,
            totalPending: 2,
          }),
        }),
      );
    });

    it('should not send digest if no pending expenses', async () => {
      em.findOne.mockResolvedValue(mockUser);
      em.find.mockResolvedValue([]);

      await service.sendDailyDigest('user-1');

      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('createPaymentRequestReminder', () => {
    it('should create reminder for approved expense without payment request link', async () => {
      const approvedExpense = {
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
        paymentRequestLink: null,
      };

      notificationService.createNotification.mockResolvedValue({} as any);

      await service.createPaymentRequestReminder(approvedExpense);

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Payment Request Link Missing',
          type: 'missing_fields',
          priority: 'high',
          recipientId: mockUser.id,
        }),
      );
    });

    it('should create reminder for approved expense (simplified logic)', async () => {
      const approvedExpense = {
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
      };

      notificationService.createNotification.mockResolvedValue({} as any);

      await service.createPaymentRequestReminder(approvedExpense);

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Payment Request Link Missing',
          type: 'missing_fields',
          priority: 'high',
          recipientId: mockUser.id,
        }),
      );
    });
  });
});
