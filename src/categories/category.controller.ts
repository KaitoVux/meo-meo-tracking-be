import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ValidationPipe,
  ParseUUIDPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateCategoryStatusDto } from './dto/update-category-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { User } from '../entities/user.entity';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  async create(
    @Body(ValidationPipe) createCategoryDto: CreateCategoryDto,
    @CurrentUser() user: User,
  ) {
    const category = await this.categoryService.create(
      createCategoryDto,
      user.id,
    );
    return {
      success: true,
      data: category,
      message: 'Category created successfully',
    };
  }

  @Get()
  async findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    const categories = await this.categoryService.findAll(includeInactive);
    return {
      success: true,
      data: categories,
    };
  }

  @Get('statistics')
  async getStatistics() {
    const stats = await this.categoryService.getUsageStatistics();
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const category = await this.categoryService.findOne(id);
    return {
      success: true,
      data: category,
    };
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateCategoryDto: UpdateCategoryDto,
    @CurrentUser() user: User,
  ) {
    const category = await this.categoryService.update(
      id,
      updateCategoryDto,
      user.id,
    );
    return {
      success: true,
      data: category,
      message: 'Category updated successfully',
    };
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateStatusDto: UpdateCategoryStatusDto,
    @CurrentUser() user: User,
  ) {
    const category = await this.categoryService.updateStatus(
      id,
      updateStatusDto,
      user.id,
    );
    return {
      success: true,
      data: category,
      message: `Category ${updateStatusDto.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.categoryService.remove(id, user.id);
    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }

  @Get(':id/usage')
  async getCategoryUsage(@Param('id', ParseUUIDPipe) id: string) {
    const usageCount = await this.categoryService.getCategoryUsageCount(id);
    return {
      success: true,
      data: {
        categoryId: id,
        usageCount,
      },
    };
  }
}
