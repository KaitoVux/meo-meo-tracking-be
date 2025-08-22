import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VendorService } from './vendor.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorQueryDto } from './dto/vendor-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @Roles(UserRole.ACCOUNTANT)
  async create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorService.create(createVendorDto);
  }

  @Get()
  async findAll(@Query() query: VendorQueryDto) {
    return this.vendorService.findAll(query);
  }

  @Get('active')
  async getActiveVendors() {
    return this.vendorService.getActiveVendors();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.vendorService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ACCOUNTANT)
  async update(@Param('id') id: string, @Body() updateVendorDto: UpdateVendorDto) {
    return this.vendorService.update(id, updateVendorDto);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.ACCOUNTANT)
  async toggleStatus(@Param('id') id: string) {
    return this.vendorService.toggleStatus(id);
  }

  @Delete(':id')
  @Roles(UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.vendorService.remove(id);
  }
}