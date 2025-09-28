import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { BadRequestException } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportRecord } from '../../entities/import-record.entity';
import { Expense } from '../../entities/expense.entity';
import { User } from '../../entities/user.entity';
import { Vendor } from '../../entities/vendor.entity';
import { Category } from '../../entities/category.entity';
import { ImportStatus } from '../dto';

describe('ImportService', () => {
  let service: ImportService;
  let importRepository: jest.Mocked<EntityRepository<ImportRecord>>;
  let expenseRepository: jest.Mocked<EntityRepository<Expense>>;
  let userRepository: jest.Mocked<EntityRepository<User>>;
  let vendorRepository: jest.Mocked<EntityRepository<Vendor>>;
  let categoryRepository: jest.Mocked<EntityRepository<Category>>;
  let entityManager: jest.Mocked<EntityManager>;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-expenses.csv',
    encoding: '7bit',
    mimetype: 'text/csv',
    size: 1024,
    destination: 'uploads/',
    filename: 'test-expenses.csv',
    path: 'uploads/test-expenses.csv',
    buffer:
      Buffer.from(`vendor,description,type,amountBeforeVat,vatAmount,amountAfterVat,currency,transactionDate,category,paymentMethod
Test Vendor,Test expense,Out,100.00,20.00,120.00,USD,2023-10-01,Office Supplies,BANK_TRANSFER`),
    stream: {} as any,
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockVendor = {
    id: 'vendor-123',
    name: 'Test Vendor',
  };

  const mockCategory = {
    id: 'category-123',
    name: 'Office Supplies',
  };

  beforeEach(async () => {
    const mockRepositories = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      persistAndFlush: jest.fn(),
      flush: jest.fn(),
      assign: jest.fn(),
    };

    const mockEntityManager = {
      fork: jest.fn(),
      persistAndFlush: jest.fn(),
      flush: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: getRepositoryToken(ImportRecord),
          useValue: mockRepositories,
        },
        {
          provide: getRepositoryToken(Expense),
          useValue: mockRepositories,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepositories,
        },
        {
          provide: getRepositoryToken(Vendor),
          useValue: mockRepositories,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockRepositories,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    importRepository = module.get(getRepositoryToken(ImportRecord));
    expenseRepository = module.get(getRepositoryToken(Expense));
    userRepository = module.get(getRepositoryToken(User));
    vendorRepository = module.get(getRepositoryToken(Vendor));
    categoryRepository = module.get(getRepositoryToken(Category));
    entityManager = module.get(EntityManager);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('previewFile', () => {
    it('should preview CSV file successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      vendorRepository.findAll.mockResolvedValue([mockVendor] as any);
      categoryRepository.findAll.mockResolvedValue([mockCategory] as any);

      const result = await service.previewFile(mockFile, 'user-123');

      expect(result).toMatchObject({
        totalRows: 1,
        headers: expect.arrayContaining(['Vendor', 'Description', 'Type']),
        sampleData: expect.any(Array),
        errors: expect.any(Array),
      });
      expect(userRepository.findOne).toHaveBeenCalledWith('user-123');
    });

    it('should reject non-CSV/Excel files', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'text/plain',
        originalname: 'test.txt',
      };

      await expect(
        service.previewFile(invalidFile, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files larger than 10MB', async () => {
      const largeFile = {
        ...mockFile,
        size: 11 * 1024 * 1024, // 11MB
      };

      await expect(service.previewFile(largeFile, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.previewFile(mockFile, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('importFile', () => {
    it('should create import record successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      const mockImportRecord = {
        id: 'import-123',
        fileName: 'test-expenses.csv',
        status: ImportStatus.PENDING,
      };
      importRepository.create.mockReturnValue(mockImportRecord as any);

      const result = await service.importFile(mockFile, 'user-123');

      expect(result).toMatchObject({
        fileName: 'test-expenses.csv',
        status: ImportStatus.PENDING,
      });
      expect(entityManager.persistAndFlush).toHaveBeenCalled();
      expect(userRepository.findOne).toHaveBeenCalledWith('user-123');
    });

    it('should throw error for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.importFile(mockFile, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getImportStatus', () => {
    it('should return import status', async () => {
      const mockImportRecord = {
        id: 'import-123',
        status: ImportStatus.PROCESSING,
        progress: 50,
      };
      importRepository.findOne.mockResolvedValue(mockImportRecord as any);

      const result = await service.getImportStatus('import-123');

      expect(result).toEqual(mockImportRecord);
      expect(importRepository.findOne).toHaveBeenCalledWith('import-123');
    });

    it('should return null for non-existent import', async () => {
      importRepository.findOne.mockResolvedValue(null);

      const result = await service.getImportStatus('non-existent');

      expect(result).toBeNull();
      expect(importRepository.findOne).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('getImportHistory', () => {
    it('should return import history for user', async () => {
      const mockHistory = [
        { id: 'import-1', status: ImportStatus.COMPLETED },
        { id: 'import-2', status: ImportStatus.FAILED },
      ];
      importRepository.find.mockResolvedValue(mockHistory as any);

      const result = await service.getImportHistory('user-123');

      expect(result).toEqual(mockHistory);
      expect(importRepository.find).toHaveBeenCalledWith(
        { uploadedBy: 'user-123' },
        { orderBy: { createdAt: 'DESC' } },
      );
    });

    it('should return empty array for non-existent user', async () => {
      importRepository.find.mockResolvedValue([]);

      const result = await service.getImportHistory('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('validateExpenseData', () => {
    beforeEach(() => {
      vendorRepository.findAll.mockResolvedValue([mockVendor] as any);
      categoryRepository.findAll.mockResolvedValue([mockCategory] as any);
    });

    it('should validate correct expense data', async () => {
      const validData = [
        {
          vendor: 'Test Vendor',
          description: 'Test expense',
          type: 'Out',
          amountBeforeVat: '100.00',
          vatAmount: '20.00',
          amountAfterVat: '120.00',
          currency: 'USD',
          transactionDate: '2023-10-01',
          category: 'Office Supplies',
          paymentMethod: 'BANK_TRANSFER',
        },
      ];

      const errors = [];
      const result = await service['validateExpenseData'](validData, errors);

      expect(errors.length).toBe(0);
      expect(result[0]).not.toBeNull();
    });

    it('should detect missing required fields', async () => {
      const invalidData = [
        {
          vendor: '',
          description: 'Test expense',
          type: 'Out',
          amountBeforeVat: '100.00',
        },
      ];

      const errors = [];
      await service['validateExpenseData'](invalidData, errors);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatchObject({
        row: 2,
        field: 'vendor',
        message: expect.stringContaining('required'),
      });
    });

    it('should detect invalid amount formats', async () => {
      const invalidData = [
        {
          vendor: 'Test Vendor',
          description: 'Test expense',
          type: 'Out',
          amountBeforeVat: '100.00',
          vatAmount: '20.00',
          amountAfterVat: 'invalid-amount',
          currency: 'USD',
          transactionDate: '2023-10-01',
          category: 'Office Supplies',
          paymentMethod: 'BANK_TRANSFER',
        },
      ];

      const errors = [];
      await service['validateExpenseData'](invalidData, errors);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.field === 'amountAfterVat')).toBe(
        true,
      );
    });

    it('should detect invalid date formats', async () => {
      const invalidData = [
        {
          vendor: 'Test Vendor',
          description: 'Test expense',
          type: 'Out',
          amountBeforeVat: '100.00',
          vatAmount: '20.00',
          amountAfterVat: '120.00',
          currency: 'USD',
          transactionDate: 'invalid-date',
          category: 'Office Supplies',
          paymentMethod: 'BANK_TRANSFER',
        },
      ];

      const errors = [];
      await service['validateExpenseData'](invalidData, errors);

      expect(
        errors.some(
          (error) =>
            error.field === 'transactionDate' && error.message.includes('date'),
        ),
      ).toBe(true);
    });

    it('should detect invalid payment methods', async () => {
      const invalidData = [
        {
          vendor: 'Test Vendor',
          description: 'Test expense',
          type: 'Out',
          amountBeforeVat: '100.00',
          vatAmount: '20.00',
          amountAfterVat: '120.00',
          currency: 'USD',
          transactionDate: '2023-10-01',
          category: 'Office Supplies',
          paymentMethod: 'INVALID_METHOD',
        },
      ];

      const errors = [];
      await service['validateExpenseData'](invalidData, errors);

      expect(
        errors.some(
          (error) =>
            error.field === 'paymentMethod' &&
            error.message.includes('Payment method must be one of'),
        ),
      ).toBe(true);
    });
  });
});
