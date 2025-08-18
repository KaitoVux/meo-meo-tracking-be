import { Controller, Get, UseGuards } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Category } from '../entities/category.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private readonly em: EntityManager) {}

  @Get()
  async findAll() {
    const categories = await this.em.find(Category, { isActive: true });
    return {
      success: true,
      data: categories,
    };
  }
}
