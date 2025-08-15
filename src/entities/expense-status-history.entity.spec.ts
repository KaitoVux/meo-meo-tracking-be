import { ExpenseStatusHistory } from './expense-status-history.entity';
import { Expense, ExpenseStatus, PaymentMethod } from './expense.entity';
import { User } from './user.entity';

describe('ExpenseStatusHistory Entity', () => {
  let statusHistory: ExpenseStatusHistory;
  let expense: Expense;
  let user: User;

  beforeEach(() => {
    statusHistory = new ExpenseStatusHistory();

    expense = new Expense();
    expense.paymentId = 'PAY-001';
    expense.date = new Date();
    expense.vendor = 'Test Vendor';
    expense.category = 'TRAVEL';
    expense.amount = 100;
    expense.description = 'Test expense';
    expense.paymentMethod = PaymentMethod.CASH;

    user = new User();
    user.email = 'accountant@example.com';
    user.name = 'Accountant User';
  });

  it('should create a status history entry', () => {
    statusHistory.fromStatus = ExpenseStatus.DRAFT;
    statusHistory.toStatus = ExpenseStatus.SUBMITTED;
    statusHistory.expense = expense;
    statusHistory.changedBy = user;
    statusHistory.notes = 'Submitted for approval';

    expect(statusHistory.id).toBeDefined();
    expect(statusHistory.fromStatus).toBe(ExpenseStatus.DRAFT);
    expect(statusHistory.toStatus).toBe(ExpenseStatus.SUBMITTED);
    expect(statusHistory.expense).toBe(expense);
    expect(statusHistory.changedBy).toBe(user);
    expect(statusHistory.notes).toBe('Submitted for approval');
    expect(statusHistory.createdAt).toBeInstanceOf(Date);
  });

  it('should allow status history without notes', () => {
    statusHistory.fromStatus = ExpenseStatus.SUBMITTED;
    statusHistory.toStatus = ExpenseStatus.APPROVED;
    statusHistory.expense = expense;
    statusHistory.changedBy = user;

    expect(statusHistory.notes).toBeUndefined();
    expect(statusHistory.fromStatus).toBe(ExpenseStatus.SUBMITTED);
    expect(statusHistory.toStatus).toBe(ExpenseStatus.APPROVED);
  });

  it('should track different status transitions', () => {
    statusHistory.fromStatus = ExpenseStatus.APPROVED;
    statusHistory.toStatus = ExpenseStatus.PAID;

    expect(statusHistory.fromStatus).toBe(ExpenseStatus.APPROVED);
    expect(statusHistory.toStatus).toBe(ExpenseStatus.PAID);
  });
});
