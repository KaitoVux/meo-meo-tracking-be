import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Category } from '../entities/category.entity';
import { Expense } from '../entities/expense.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { UpdateCategoryStatusDto } from './dto/update-category-status.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly em: EntityManager) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    userId: string,
  ): Promise<CategoryResponseDto> {
    // Check if code already exists
    const existingCategory = await this.em.findOne(Category, {
      code: createCategoryDto.code,
    });
    if (existingCategory) {
      throw new ConflictException(
        `Category with code '${createCategoryDto.code}' already exists`,
      );
    }

    // Check if name already exists
    const existingNameCategory = await this.em.findOne(Category, {
      name: createCategoryDto.name,
    });
    if (existingNameCategory) {
      throw new ConflictException(
        `Category with name '${createCategoryDto.name}' already exists`,
      );
    }

    const category = new Category();
    category.name = createCategoryDto.name;
    category.code = createCategoryDto.code;
    category.description = createCategoryDto.description;
    category.isActive = createCategoryDto.isActive ?? true;
    category.createdBy = userId;
    category.updatedBy = userId;

    await this.em.persistAndFlush(category);

    return CategoryResponseDto.fromEntity(category, 0);
  }

  async findAll(includeInactive?: boolean): Promise<CategoryResponseDto[]> {
    const filter: any = {};
    if (!includeInactive) {
      filter.isActive = true;
    }

    const categories = await this.em.find(Category, filter, {
      orderBy: { name: 'ASC' },
    });

    // Get usage counts for all categories
    const usageCounts = await this.getCategoryUsageCounts();

    return CategoryResponseDto.fromEntities(categories, usageCounts);
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.em.findOne(Category, { id });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    const usageCount = await this.getCategoryUsageCount(id);

    return CategoryResponseDto.fromEntity(category, usageCount);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.em.findOne(Category, { id });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    // Check if code already exists (excluding current category)
    if (updateCategoryDto.code && updateCategoryDto.code !== category.code) {
      const existingCategory = await this.em.findOne(Category, {
        code: updateCategoryDto.code,
        id: { $ne: id },
      });
      if (existingCategory) {
        throw new ConflictException(
          `Category with code '${updateCategoryDto.code}' already exists`,
        );
      }
    }

    // Check if name already exists (excluding current category)
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingNameCategory = await this.em.findOne(Category, {
        name: updateCategoryDto.name,
        id: { $ne: id },
      });
      if (existingNameCategory) {
        throw new ConflictException(
          `Category with name '${updateCategoryDto.name}' already exists`,
        );
      }
    }

    // Update other fields
    if (updateCategoryDto.name !== undefined) {
      category.name = updateCategoryDto.name;
    }
    if (updateCategoryDto.code !== undefined) {
      category.code = updateCategoryDto.code;
    }
    if (updateCategoryDto.description !== undefined) {
      category.description = updateCategoryDto.description;
    }
    if (updateCategoryDto.isActive !== undefined) {
      category.isActive = updateCategoryDto.isActive;
    }

    category.updatedBy = userId;

    await this.em.persistAndFlush(category);

    const usageCount = await this.getCategoryUsageCount(id);
    return CategoryResponseDto.fromEntity(category, usageCount);
  }

  async remove(id: string, userId: string): Promise<void> {
    const category = await this.em.findOne(Category, { id });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    // Check if category is used by expenses
    const expenseCount = await this.em.count(Expense, {
      categoryEntity: category,
    });
    if (expenseCount > 0) {
      throw new BadRequestException(
        `Cannot delete category that is used by ${expenseCount} expense(s)`,
      );
    }

    category.deletedBy = userId;
    await this.em.removeAndFlush(category);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateCategoryStatusDto,
    userId: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.em.findOne(Category, { id });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    category.isActive = updateStatusDto.isActive;
    category.updatedBy = userId;

    await this.em.persistAndFlush(category);

    const usageCount = await this.getCategoryUsageCount(id);
    return CategoryResponseDto.fromEntity(category, usageCount);
  }

  async getCategoryUsageCount(categoryId: string): Promise<number> {
    return await this.em.count(Expense, { categoryEntity: { id: categoryId } });
  }

  async getCategoryUsageCounts(): Promise<Map<string, number>> {
    // Use raw query to get usage counts
    const query = `
      SELECT category_entity_id as "categoryId", COUNT(*) as count
      FROM expense
      WHERE deleted_at IS NULL
      GROUP BY category_entity_id
    `;

    const usageStats = await this.em.getConnection().execute(query);

    const usageMap = new Map<string, number>();
    for (const stat of usageStats) {
      if (stat.categoryId) {
        usageMap.set(stat.categoryId, parseInt(stat.count as string));
      }
    }

    return usageMap;
  }

  async getUsageStatistics(_categoryId?: string): Promise<{
    totalCategories: number;
    activeCategories: number;
    inactiveCategories: number;
    categoriesWithExpenses: number;
    mostUsedCategory?: CategoryResponseDto;
  }> {
    const totalCategories = await this.em.count(Category, {});
    const activeCategories = await this.em.count(Category, { isActive: true });
    const inactiveCategories = totalCategories - activeCategories;

    const usageCounts = await this.getCategoryUsageCounts();
    const categoriesWithExpenses = usageCounts.size;

    let mostUsedCategory: CategoryResponseDto | undefined;
    if (usageCounts.size > 0) {
      const maxUsage = Math.max(...usageCounts.values());
      const mostUsedCategoryId = [...usageCounts.entries()].find(
        ([_, count]) => count === maxUsage,
      )?.[0];

      if (mostUsedCategoryId) {
        const category = await this.em.findOne(Category, {
          id: mostUsedCategoryId,
        });
        if (category) {
          mostUsedCategory = CategoryResponseDto.fromEntity(category, maxUsage);
        }
      }
    }

    return {
      totalCategories,
      activeCategories,
      inactiveCategories,
      categoriesWithExpenses,
      mostUsedCategory,
    };
  }
}
