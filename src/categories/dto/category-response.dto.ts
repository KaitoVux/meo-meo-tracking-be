import { Category } from '../../entities/category.entity';

export class CategoryResponseDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  parentId?: string;
  parent?: CategoryResponseDto;
  children?: CategoryResponseDto[];
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
    dto.parentId = category.parent?.id;
    dto.parent = category.parent
      ? CategoryResponseDto.fromEntity(category.parent)
      : undefined;
    dto.children = category.children?.isInitialized()
      ? category.children
          .getItems()
          .map((child) => CategoryResponseDto.fromEntity(child))
      : undefined;
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
