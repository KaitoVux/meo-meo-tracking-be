import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
import { CategoryService } from './category.service';
import { Category } from '../entities/category.entity';
import { Expense } from '../entities/expense.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateCategoryStatusDto } from './dto/update-category-status.dto';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('CategoryService', () => {
  let service: CategoryService;
  let em: jest.Mocked<EntityManager>;

  const mockUser = { id: 'user-123' };

  const mockCategory: Partial<Category> = {
    id: 'category-123',
    name: 'Travel',
    code: 'TRAVEL',
    description: 'Travel expenses',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    updatedBy: 'user-123',
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    persistAndFlush: jest.fn(),
    removeAndFlush: jest.fn(),
    getKnex: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    em = module.get(EntityManager);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateCategoryDto = {
      name: 'Travel',
      code: 'TRAVEL',
      description: 'Travel expenses',
      isActive: true,
    };

    it('should create a category successfully', async () => {
      em.findOne.mockResolvedValue(null); // No existing category
      em.persistAndFlush.mockResolvedValue(undefined);

      const result = await service.create(createDto, mockUser.id);

      expect(em.findOne).toHaveBeenCalledWith(Category, { code: 'TRAVEL' });
      expect(em.findOne).toHaveBeenCalledWith(Category, { name: 'Travel' });
      expect(em.persistAndFlush).toHaveBeenCalled();
      expect(result.name).toBe('Travel');
      expect(result.code).toBe('TRAVEL');
      expect(result.isActive).toBe(true);
      expect(result.usageCount).toBe(0);
    });

    it('should throw ConflictException if code already exists', async () => {
      em.findOne.mockResolvedValueOnce(mockCategory); // Existing category with same code

      await expect(service.create(createDto, mockUser.id)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if name already exists', async () => {
      em.findOne
        .mockResolvedValueOnce(null) // No existing code
        .mockResolvedValueOnce(mockCategory); // Existing name

      await expect(service.create(createDto, mockUser.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getCategoryUsageCount', () => {
    it('should return usage count for a category', async () => {
      em.count.mockResolvedValue(5);

      const result = await service.getCategoryUsageCount('category-123');

      expect(em.count).toHaveBeenCalledWith(Expense, {
        categoryEntity: { id: 'category-123' },
      });
      expect(result).toBe(5);
    });
  });
});
