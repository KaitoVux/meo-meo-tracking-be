import {
  Currency,
  Expense,
  ExpenseStatus,
  PaymentMethod,
} from './expense.entity';
import { User } from './user.entity';

describe('Expense Entity', () => {
  let expense: Expense;
  let user: User;

  beforeEach(() => {
    expense = new Expense();
    user = new User();
    user.email = 'test@example.com';
    user.name = 'Test User';
  });

  it('should create an expense with default values', () => {
    expense.paymentId = 'PAY-001';
    expense.date = new Date('2024-01-15');
    expense.vendor = 'Test Vendor';
    expense.category = 'TRAVEL';
    expense.amount = 100.5;
    expense.description = 'Business travel expense';
    expense.paymentMethod = PaymentMethod.CASH;
    expense.submitter = user;

    expect(expense.id).toBeDefined();
    expect(expense.paymentId).toBe('PAY-001');
    expect(expense.date).toEqual(new Date('2024-01-15'));
    expect(expense.vendor).toBe('Test Vendor');
    expect(expense.category).toBe('TRAVEL');
    expect(expense.amount).toBe(100.5);
    expect(expense.currency).toBe(Currency.VND);
    expect(expense.description).toBe('Business travel expense');
    expect(expense.paymentMethod).toBe(PaymentMethod.CASH);
    expect(expense.status).toBe(ExpenseStatus.DRAFT);
    expect(expense.createdAt).toBeInstanceOf(Date);
    expect(expense.updatedAt).toBeInstanceOf(Date);
  });

  it('should allow setting USD currency', () => {
    expense.currency = Currency.USD;
    expect(expense.currency).toBe(Currency.USD);
  });

  it('should allow setting bank transfer payment method', () => {
    expense.paymentMethod = PaymentMethod.BANK_TRANSFER;
    expect(expense.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER);
  });

  it('should allow changing status', () => {
    expense.status = ExpenseStatus.SUBMITTED;
    expect(expense.status).toBe(ExpenseStatus.SUBMITTED);
  });

  it('should allow setting exchange rate for foreign currency', () => {
    expense.currency = Currency.USD;
    expense.exchangeRate = 24000.5;
    expect(expense.exchangeRate).toBe(24000.5);
  });

  it('should allow setting optional fields', () => {
    expense.subId = 'SUB-001';
    expense.projectCostCenter = 'PROJECT-A';

    expect(expense.subId).toBe('SUB-001');
    expect(expense.projectCostCenter).toBe('PROJECT-A');
  });

  it('should have status history collection initialized', () => {
    expect(expense.statusHistory).toBeDefined();
    expect(expense.statusHistory.length).toBe(0);
  });
});
