import { Category } from '../../entities/category.entity';

export class CategoryResponseDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  usageCount?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;

  static fromEntity(
    category: Category,
    usageCount?: number,
  ): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = category.id;
    dto.name = category.name;
    dto.code = category.code;
    dto.description = category.description;
    dto.isActive = category.isActive;
    dto.usageCount = usageCount;
    dto.createdAt = category.createdAt;
    dto.updatedAt = category.updatedAt;
    dto.createdBy = category.createdBy;
    dto.updatedBy = category.updatedBy;
    return dto;
  }

  static fromEntities(
    categories: Category[],
    usageCounts?: Map<string, number>,
  ): CategoryResponseDto[] {
    return categories.map((category) =>
      CategoryResponseDto.fromEntity(category, usageCounts?.get(category.id)),
    );
  }
}
