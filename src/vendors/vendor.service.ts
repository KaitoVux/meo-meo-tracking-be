import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EntityManager, QueryOrder } from '@mikro-orm/core';
import { Vendor, VendorStatus } from '../entities/vendor.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorQueryDto } from './dto/vendor-query.dto';

@Injectable()
export class VendorService {
  constructor(
    private readonly em: EntityManager,
  ) {}

  async create(createVendorDto: CreateVendorDto): Promise<Vendor> {
    // Check if vendor with same name already exists
    const existingVendor = await this.em.findOne(Vendor, {
      name: createVendorDto.name,
      deletedAt: null,
    });

    if (existingVendor) {
      throw new ConflictException('Vendor with this name already exists');
    }

    const vendor = this.em.create(Vendor, {
      ...createVendorDto,
      status: createVendorDto.status || VendorStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.em.persistAndFlush(vendor);
    return vendor;
  }

  async findAll(query: VendorQueryDto): Promise<{
    vendors: Vendor[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { search, status, page = 1, limit = 100, sortBy = 'name', sortOrder = 'ASC' } = query;

    const where: any = { deletedAt: null };

    if (search) {
      where.$or = [
        { name: { $ilike: `%${search}%` } },
        { contactInfo: { $ilike: `%${search}%` } },
        { email: { $ilike: `%${search}%` } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [vendors, total] = await this.em.findAndCount(Vendor, where, {
      orderBy: { [sortBy]: sortOrder as QueryOrder },
      limit,
      offset: (page - 1) * limit,
    });

    return {
      vendors,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Vendor> {
    const vendor = await this.em.findOne(Vendor, {
      id,
      deletedAt: null,
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async update(id: string, updateVendorDto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.findOne(id);

    // Check if updating name and new name already exists
    if (updateVendorDto.name && updateVendorDto.name !== vendor.name) {
      const existingVendor = await this.em.findOne(Vendor, {
        name: updateVendorDto.name,
        deletedAt: null,
        id: { $ne: id },
      });

      if (existingVendor) {
        throw new ConflictException('Vendor with this name already exists');
      }
    }

    this.em.assign(vendor, updateVendorDto);
    await this.em.persistAndFlush(vendor);
    return vendor;
  }

  async remove(id: string): Promise<void> {
    const vendor = await this.findOne(id);
    vendor.deletedAt = new Date();
    await this.em.persistAndFlush(vendor);
  }

  async toggleStatus(id: string): Promise<Vendor> {
    const vendor = await this.findOne(id);
    vendor.status = vendor.status === VendorStatus.ACTIVE ? VendorStatus.INACTIVE : VendorStatus.ACTIVE;
    await this.em.persistAndFlush(vendor);
    return vendor;
  }

  async getActiveVendors(): Promise<Vendor[]> {
    return this.em.find(Vendor, {
      status: VendorStatus.ACTIVE,
      deletedAt: null,
    }, {
      orderBy: { name: QueryOrder.ASC },
    });
  }
}