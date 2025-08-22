import { Test, TestingModule } from '@nestjs/testing';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';
import { Vendor, VendorStatus } from '../entities/vendor.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorQueryDto } from './dto/vendor-query.dto';

describe('VendorController', () => {
  let controller: VendorController;
  let service: jest.Mocked<VendorService>;

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
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      toggleStatus: jest.fn(),
      getActiveVendors: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorController],
      providers: [
        {
          provide: VendorService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<VendorController>(VendorController);
    service = module.get(VendorService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a vendor', async () => {
      const createVendorDto: CreateVendorDto = {
        name: 'Test Vendor',
        contactInfo: 'test@vendor.com',
        address: '123 Test St',
        taxId: 'TAX123',
        email: 'test@vendor.com',
        phone: '+1234567890',
        status: VendorStatus.ACTIVE,
      };

      service.create.mockResolvedValue(mockVendor);

      const result = await controller.create(createVendorDto);

      expect(service.create).toHaveBeenCalledWith(createVendorDto);
      expect(result).toEqual(mockVendor);
    });
  });

  describe('findAll', () => {
    it('should return paginated vendors', async () => {
      const queryDto: VendorQueryDto = {
        page: 1,
        limit: 10,
        search: 'test',
        status: VendorStatus.ACTIVE,
      };

      const paginatedResult = {
        vendors: [mockVendor],
        total: 1,
        page: 1,
        limit: 10,
      };

      service.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('getActiveVendors', () => {
    it('should return active vendors', async () => {
      const activeVendors = [mockVendor];
      service.getActiveVendors.mockResolvedValue(activeVendors);

      const result = await controller.getActiveVendors();

      expect(service.getActiveVendors).toHaveBeenCalled();
      expect(result).toEqual(activeVendors);
    });
  });

  describe('findOne', () => {
    it('should return a vendor by id', async () => {
      service.findOne.mockResolvedValue(mockVendor);

      const result = await controller.findOne(mockVendor.id);

      expect(service.findOne).toHaveBeenCalledWith(mockVendor.id);
      expect(result).toEqual(mockVendor);
    });
  });

  describe('update', () => {
    it('should update a vendor', async () => {
      const updateVendorDto: UpdateVendorDto = {
        name: 'Updated Vendor',
      };

      const updatedVendor = { ...mockVendor, name: 'Updated Vendor' };
      service.update.mockResolvedValue(updatedVendor);

      const result = await controller.update(mockVendor.id, updateVendorDto);

      expect(service.update).toHaveBeenCalledWith(
        mockVendor.id,
        updateVendorDto,
      );
      expect(result).toEqual(updatedVendor);
    });
  });

  describe('toggleStatus', () => {
    it('should toggle vendor status', async () => {
      const toggledVendor = { ...mockVendor, status: VendorStatus.INACTIVE };
      service.toggleStatus.mockResolvedValue(toggledVendor);

      const result = await controller.toggleStatus(mockVendor.id);

      expect(service.toggleStatus).toHaveBeenCalledWith(mockVendor.id);
      expect(result).toEqual(toggledVendor);
    });
  });

  describe('remove', () => {
    it('should remove a vendor', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockVendor.id);

      expect(service.remove).toHaveBeenCalledWith(mockVendor.id);
      expect(result).toBeUndefined();
    });
  });
});
