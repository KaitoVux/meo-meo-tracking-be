import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateCategoryStatusDto } from './dto/update-category-status.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { User } from '../entities/user.entity';

describe('CategoryController', () => {
  let controller: CategoryController;
  let categoryService: jest.Mocked<CategoryService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  } as User;

  const mockCategoryResponse: CategoryResponseDto = {
    id: 'category-123',
    name: 'Travel',
    code: 'TRAVEL',
    description: 'Travel expenses',
    isActive: true,
    usageCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    updatedBy: 'user-123',
  };

  const mockCategoryService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
    getCategoryUsageCount: jest.fn(),
    getUsageStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    categoryService = module.get(CategoryService);

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

    it('should create a category', async () => {
      categoryService.create.mockResolvedValue(mockCategoryResponse);

      const result = await controller.create(createDto, mockUser);

      expect(categoryService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.id,
      );
      expect(result).toEqual({
        success: true,
        data: mockCategoryResponse,
        message: 'Category created successfully',
      });
    });
  });

  describe('findAll', () => {
    it('should return all active categories by default', async () => {
      const categories = [mockCategoryResponse];
      categoryService.findAll.mockResolvedValue(categories);

      const result = await controller.findAll();

      expect(categoryService.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({
        success: true,
        data: categories,
      });
    });

    it('should include inactive categories when requested', async () => {
      const categories = [mockCategoryResponse];
      categoryService.findAll.mockResolvedValue(categories);

      const result = await controller.findAll(true);

      expect(categoryService.findAll).toHaveBeenCalledWith(true);
      expect(result).toEqual({
        success: true,
        data: categories,
      });
    });
  });

  describe('getStatistics', () => {
    it('should return usage statistics', async () => {
      const mockStats = {
        totalCategories: 10,
        activeCategories: 8,
        inactiveCategories: 2,
        categoriesWithExpenses: 5,
        mostUsedCategory: mockCategoryResponse,
      };
      categoryService.getUsageStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics();

      expect(categoryService.getUsageStatistics).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: mockStats,
      });
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      categoryService.findOne.mockResolvedValue(mockCategoryResponse);

      const result = await controller.findOne('category-123');

      expect(categoryService.findOne).toHaveBeenCalledWith('category-123');
      expect(result).toEqual({
        success: true,
        data: mockCategoryResponse,
      });
    });
  });

  describe('update', () => {
    const updateDto: UpdateCategoryDto = {
      name: 'Updated Travel',
      description: 'Updated description',
    };

    it('should update a category', async () => {
      const updatedCategory = { ...mockCategoryResponse, ...updateDto };
      categoryService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update(
        'category-123',
        updateDto,
        mockUser,
      );

      expect(categoryService.update).toHaveBeenCalledWith(
        'category-123',
        updateDto,
        mockUser.id,
      );
      expect(result).toEqual({
        success: true,
        data: updatedCategory,
        message: 'Category updated successfully',
      });
    });
  });

  describe('updateStatus', () => {
    const statusDto: UpdateCategoryStatusDto = { isActive: false };

    it('should update category status to inactive', async () => {
      const updatedCategory = { ...mockCategoryResponse, isActive: false };
      categoryService.updateStatus.mockResolvedValue(updatedCategory);

      const result = await controller.updateStatus(
        'category-123',
        statusDto,
        mockUser,
      );

      expect(categoryService.updateStatus).toHaveBeenCalledWith(
        'category-123',
        statusDto,
        mockUser.id,
      );
      expect(result).toEqual({
        success: true,
        data: updatedCategory,
        message: 'Category deactivated successfully',
      });
    });

    it('should update category status to active', async () => {
      const activateDto: UpdateCategoryStatusDto = { isActive: true };
      const updatedCategory = { ...mockCategoryResponse, isActive: true };
      categoryService.updateStatus.mockResolvedValue(updatedCategory);

      const result = await controller.updateStatus(
        'category-123',
        activateDto,
        mockUser,
      );

      expect(categoryService.updateStatus).toHaveBeenCalledWith(
        'category-123',
        activateDto,
        mockUser.id,
      );
      expect(result).toEqual({
        success: true,
        data: updatedCategory,
        message: 'Category activated successfully',
      });
    });
  });

  describe('remove', () => {
    it('should delete a category', async () => {
      categoryService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('category-123', mockUser);

      expect(categoryService.remove).toHaveBeenCalledWith(
        'category-123',
        mockUser.id,
      );
      expect(result).toEqual({
        success: true,
        message: 'Category deleted successfully',
      });
    });
  });

  describe('getCategoryUsage', () => {
    it('should return category usage count', async () => {
      categoryService.getCategoryUsageCount.mockResolvedValue(5);

      const result = await controller.getCategoryUsage('category-123');

      expect(categoryService.getCategoryUsageCount).toHaveBeenCalledWith(
        'category-123',
      );
      expect(result).toEqual({
        success: true,
        data: {
          categoryId: 'category-123',
          usageCount: 5,
        },
      });
    });
  });
});
