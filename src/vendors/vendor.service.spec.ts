import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { Vendor, VendorStatus } from '../entities/vendor.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorQueryDto } from './dto/vendor-query.dto';

describe('VendorService', () => {
  let service: VendorService;
  let repository: jest.Mocked<EntityRepository<Vendor>>;

  const mockVendor: Vendor = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Vendor',
    contactInfo: 'test@vendor.com',
    address: '123 Test St',
    taxId: 'TAX123',
    email: 'test@vendor.com',
    phone: '+1234567890',
    status: VendorStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    expenses: {} as any,
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      find: jest.fn(),
      assign: jest.fn(),
      persistAndFlush: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorService,
        {
          provide: getRepositoryToken(Vendor),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<VendorService>(VendorService);
    repository = module.get(getRepositoryToken(Vendor));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createVendorDto: CreateVendorDto = {
      name: 'Test Vendor',
      contactInfo: 'test@vendor.com',
      address: '123 Test St',
      taxId: 'TAX123',
      email: 'test@vendor.com',
      phone: '+1234567890',
      status: VendorStatus.ACTIVE,
    };

    it('should create a vendor successfully', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockVendor);
      repository.persistAndFlush.mockResolvedValue(undefined);

      const result = await service.create(createVendorDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        name: createVendorDto.name,
        deletedAt: null,
      });
      expect(repository.create).toHaveBeenCalledWith(createVendorDto);
      expect(repository.persistAndFlush).toHaveBeenCalledWith(mockVendor);
      expect(result).toEqual(mockVendor);
    });

    it('should throw ConflictException if vendor name already exists', async () => {
      repository.findOne.mockResolvedValue(mockVendor);

      await expect(service.create(createVendorDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    const queryDto: VendorQueryDto = {
      page: 1,
      limit: 10,
      search: 'test',
      status: VendorStatus.ACTIVE,
    };

    it('should return paginated vendors', async () => {
      const vendors = [mockVendor];
      const total = 1;
      repository.findAndCount.mockResolvedValue([vendors, total]);

      const result = await service.findAll(queryDto);

      expect(result).toEqual({
        vendors,
        total,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return a vendor by id', async () => {
      repository.findOne.mockResolvedValue(mockVendor);

      const result = await service.findOne(mockVendor.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        id: mockVendor.id,
        deletedAt: null,
      });
      expect(result).toEqual(mockVendor);
    });

    it('should throw NotFoundException if vendor not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateVendorDto: UpdateVendorDto = {
      name: 'Updated Vendor',
    };

    it('should update a vendor successfully', async () => {
      repository.findOne.mockResolvedValueOnce(mockVendor);
      repository.findOne.mockResolvedValueOnce(null);
      repository.assign.mockReturnValue(undefined);
      repository.persistAndFlush.mockResolvedValue(undefined);

      const result = await service.update(mockVendor.id, updateVendorDto);

      expect(repository.assign).toHaveBeenCalledWith(
        mockVendor,
        updateVendorDto,
      );
      expect(repository.persistAndFlush).toHaveBeenCalledWith(mockVendor);
      expect(result).toEqual(mockVendor);
    });

    it('should throw ConflictException if new name already exists', async () => {
      const existingVendor = { ...mockVendor, id: 'different-id' };
      repository.findOne.mockResolvedValueOnce(mockVendor);
      repository.findOne.mockResolvedValueOnce(existingVendor);

      await expect(
        service.update(mockVendor.id, updateVendorDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete a vendor', async () => {
      repository.findOne.mockResolvedValue(mockVendor);
      repository.persistAndFlush.mockResolvedValue(undefined);

      await service.remove(mockVendor.id);

      expect(mockVendor.deletedAt).toBeInstanceOf(Date);
      expect(repository.persistAndFlush).toHaveBeenCalledWith(mockVendor);
    });
  });

  describe('toggleStatus', () => {
    it('should toggle vendor status from ACTIVE to INACTIVE', async () => {
      const activeVendor = { ...mockVendor, status: VendorStatus.ACTIVE };
      repository.findOne.mockResolvedValue(activeVendor);
      repository.persistAndFlush.mockResolvedValue(undefined);

      const result = await service.toggleStatus(mockVendor.id);

      expect(activeVendor.status).toBe(VendorStatus.INACTIVE);
      expect(repository.persistAndFlush).toHaveBeenCalledWith(activeVendor);
      expect(result).toEqual(activeVendor);
    });
  });

  describe('getActiveVendors', () => {
    it('should return only active vendors', async () => {
      const activeVendors = [mockVendor];
      repository.find.mockResolvedValue(activeVendors);

      const result = await service.getActiveVendors();

      expect(repository.find).toHaveBeenCalledWith(
        {
          status: VendorStatus.ACTIVE,
          deletedAt: null,
        },
        {
          orderBy: { name: 'ASC' },
        },
      );
      expect(result).toEqual(activeVendors);
    });
  });
});
