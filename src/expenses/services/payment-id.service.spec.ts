import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
import { PaymentIdService } from './payment-id.service';
import { Expense } from '../../entities/expense.entity';

describe('PaymentIdService', () => {
  let service: PaymentIdService;
  let entityManager: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentIdService,
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<PaymentIdService>(PaymentIdService);
    entityManager = module.get(EntityManager);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePaymentId', () => {
    it('should generate payment ID "1" for first expense', async () => {
      entityManager.find.mockResolvedValue([]);
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.generatePaymentId(
        'Test Vendor',
        new Date('2024-01-15'),
      );

      expect(result.paymentId).toBe('1');
      expect(result.subId).toBeUndefined();
    });

    it('should generate next payment ID when no same vendor exists', async () => {
      const existingExpense = new Expense();
      existingExpense.paymentId = '5';
      existingExpense.vendor = 'Different Vendor';

      entityManager.find.mockResolvedValue([]);
      entityManager.findOne.mockResolvedValue(existingExpense);

      const result = await service.generatePaymentId(
        'Test Vendor',
        new Date('2024-01-15'),
      );

      expect(result.paymentId).toBe('6');
      expect(result.subId).toBeUndefined();
    });

    it('should generate sub-ID for same vendor on same date', async () => {
      const existingExpense = new Expense();
      existingExpense.paymentId = '5';
      existingExpense.subId = '1';
      existingExpense.vendor = 'Test Vendor';

      entityManager.find.mockResolvedValue([existingExpense]);

      const result = await service.generatePaymentId(
        'Test Vendor',
        new Date('2024-01-15'),
      );

      expect(result.paymentId).toBe('5');
      expect(result.subId).toBe('2');
    });

    it('should handle multiple sub-IDs correctly', async () => {
      const expense1 = new Expense();
      expense1.paymentId = '5';
      expense1.subId = '1';
      expense1.vendor = 'Test Vendor';

      const expense2 = new Expense();
      expense2.paymentId = '5';
      expense2.subId = '3';
      expense2.vendor = 'Test Vendor';

      entityManager.find.mockResolvedValue([expense2, expense1]);

      const result = await service.generatePaymentId(
        'Test Vendor',
        new Date('2024-01-15'),
      );

      expect(result.paymentId).toBe('5');
      expect(result.subId).toBe('4');
    });

    it('should handle first sub-ID when main payment exists without sub-ID', async () => {
      const existingExpense = new Expense();
      existingExpense.paymentId = '5';
      existingExpense.subId = undefined;
      existingExpense.vendor = 'Test Vendor';

      entityManager.find.mockResolvedValue([existingExpense]);

      const result = await service.generatePaymentId(
        'Test Vendor',
        new Date('2024-01-15'),
      );

      expect(result.paymentId).toBe('5');
      expect(result.subId).toBe('1');
    });
  });

  describe('validatePaymentIdFormat', () => {
    it('should validate numeric payment ID', () => {
      expect(service.validatePaymentIdFormat('123')).toBe(true);
      expect(service.validatePaymentIdFormat('1')).toBe(true);
    });

    it('should validate numeric payment ID with sub-ID', () => {
      expect(service.validatePaymentIdFormat('123', '1')).toBe(true);
      expect(service.validatePaymentIdFormat('1', '99')).toBe(true);
    });

    it('should reject non-numeric payment ID', () => {
      expect(service.validatePaymentIdFormat('abc')).toBe(false);
      expect(service.validatePaymentIdFormat('12a')).toBe(false);
    });

    it('should reject non-numeric sub-ID', () => {
      expect(service.validatePaymentIdFormat('123', 'abc')).toBe(false);
      expect(service.validatePaymentIdFormat('123', '1a')).toBe(false);
    });
  });

  describe('formatPaymentId', () => {
    it('should format payment ID without sub-ID', () => {
      expect(service.formatPaymentId('123')).toBe('123');
    });

    it('should format payment ID with sub-ID', () => {
      expect(service.formatPaymentId('123', '1')).toBe('123-1');
      expect(service.formatPaymentId('5', '2')).toBe('5-2');
    });
  });

  describe('parsePaymentId', () => {
    it('should parse payment ID without sub-ID', () => {
      const result = service.parsePaymentId('123');
      expect(result.paymentId).toBe('123');
      expect(result.subId).toBeUndefined();
    });

    it('should parse payment ID with sub-ID', () => {
      const result = service.parsePaymentId('123-1');
      expect(result.paymentId).toBe('123');
      expect(result.subId).toBe('1');
    });

    it('should throw error for invalid format', () => {
      expect(() => service.parsePaymentId('123-1-2')).toThrow(
        'Invalid payment ID format',
      );
      expect(() => service.parsePaymentId('')).toThrow(
        'Invalid payment ID format',
      );
    });
  });
});
