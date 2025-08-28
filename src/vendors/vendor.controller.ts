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
import { ResponseHelper } from '../common/decorators/api-response.decorator';

@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @Roles(UserRole.ACCOUNTANT)
  async create(@Body() createVendorDto: CreateVendorDto) {
    const vendor = await this.vendorService.create(createVendorDto);
    return ResponseHelper.created(vendor, 'Vendor created successfully');
  }

  @Get()
  async findAll(@Query() query: VendorQueryDto) {
    const result = await this.vendorService.findAll(query);
    // Check if result has pagination structure
    if (result && typeof result === 'object' && 'total' in result) {
      const data =
        'data' in result
          ? result.data
          : 'vendors' in result
            ? (result as any).vendors
            : result;
      const page = 'page' in result ? (result as any).page : 1;
      const limit = 'limit' in result ? (result as any).limit : 10;
      const total = (result as any).total;

      return ResponseHelper.paginated(data, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    }
    return ResponseHelper.success(result);
  }

  @Get('active')
  async getActiveVendors() {
    const vendors = await this.vendorService.getActiveVendors();
    return ResponseHelper.success(vendors);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const vendor = await this.vendorService.findOne(id);
    return ResponseHelper.success(vendor);
  }

  @Patch(':id')
  @Roles(UserRole.ACCOUNTANT)
  async update(
    @Param('id') id: string,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    const vendor = await this.vendorService.update(id, updateVendorDto);
    return ResponseHelper.updated(vendor, 'Vendor updated successfully');
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.ACCOUNTANT)
  async toggleStatus(@Param('id') id: string) {
    const vendor = await this.vendorService.toggleStatus(id);
    return ResponseHelper.updated(vendor, 'Vendor status updated successfully');
  }

  @Delete(':id')
  @Roles(UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.vendorService.remove(id);
    return ResponseHelper.deleted('Vendor deleted successfully');
  }
}
