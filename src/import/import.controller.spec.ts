import { Test, TestingModule } from '@nestjs/testing';
import { ImportController } from './import.controller';
import { ImportService } from './services/import.service';
import { ImportPreviewDto, ImportStatusDto, ImportStatus } from './dto';

describe('ImportController', () => {
  let controller: ImportController;
  let importService: jest.Mocked<ImportService>;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-expenses.csv',
    encoding: '7bit',
    mimetype: 'text/csv',
    size: 1024,
    destination: 'uploads/',
    filename: 'test-expenses.csv',
    path: 'uploads/test-expenses.csv',
    buffer: Buffer.from('test,data'),
    stream: {} as any,
  };

  const mockUser = {
    sub: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'User',
  };

  const mockRequest = {
    user: mockUser,
  };

  const mockPreviewDto: ImportPreviewDto = {
    totalRows: 10,
    headers: ['vendor', 'description', 'amount'],
    sampleData: [
      { vendor: 'Test Vendor', description: 'Test expense', amount: '100.00' },
    ],
    errors: [],
  };

  const mockImportRecord = {
    id: 'import-123',
    fileName: 'test-expenses.csv',
    status: ImportStatus.PENDING,
    progress: 0,
    totalRows: 10,
    processedRows: 0,
    successfulRows: 0,
    errorRows: 0,
    createdAt: new Date(),
    completedAt: null,
  };

  const mockStatusDto: ImportStatusDto = {
    id: 'import-123',
    fileName: 'test-expenses.csv',
    status: ImportStatus.PENDING,
    progress: 0,
    totalRows: 10,
    processedRows: 0,
    successfulRows: 0,
    errorRows: 0,
    createdAt: new Date(),
    completedAt: null,
  };

  beforeEach(async () => {
    const mockImportService = {
      previewFile: jest.fn(),
      importFile: jest.fn(),
      getImportStatus: jest.fn(),
      getImportHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        {
          provide: ImportService,
          useValue: mockImportService,
        },
      ],
    }).compile();

    controller = module.get<ImportController>(ImportController);
    importService = module.get(ImportService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('previewFile', () => {
    it('should preview file successfully', async () => {
      importService.previewFile.mockResolvedValue(mockPreviewDto);

      const result = await controller.previewFile(mockFile, mockRequest);

      expect(importService.previewFile).toHaveBeenCalledWith(
        mockFile,
        mockUser.sub,
      );
      expect(result).toEqual({
        success: true,
        message: 'File preview generated successfully',
        data: mockPreviewDto,
      });
    });

    it('should handle preview errors', async () => {
      const error = new Error('Invalid file format');
      importService.previewFile.mockRejectedValue(error);

      await expect(
        controller.previewFile(mockFile, mockRequest),
      ).rejects.toThrow(error);
      expect(importService.previewFile).toHaveBeenCalledWith(
        mockFile,
        mockUser.sub,
      );
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      importService.importFile.mockResolvedValue(mockImportRecord as any);

      const result = await controller.uploadFile(mockFile, mockRequest);

      expect(importService.importFile).toHaveBeenCalledWith(
        mockFile,
        mockUser.sub,
      );
      expect(result).toEqual({
        success: true,
        message: 'Import started successfully',
        data: mockStatusDto,
      });
    });

    it('should handle upload errors', async () => {
      const error = new Error('Upload failed');
      importService.importFile.mockRejectedValue(error);

      await expect(
        controller.uploadFile(mockFile, mockRequest),
      ).rejects.toThrow(error);
      expect(importService.importFile).toHaveBeenCalledWith(
        mockFile,
        mockUser.sub,
      );
    });
  });

  describe('getImportStatus', () => {
    it('should get import status successfully', async () => {
      importService.getImportStatus.mockResolvedValue(mockImportRecord as any);

      const result = await controller.getImportStatus('import-123');

      expect(importService.getImportStatus).toHaveBeenCalledWith('import-123');
      expect(result).toEqual({
        success: true,
        message: 'Import status retrieved successfully',
        data: mockStatusDto,
      });
    });

    it('should handle missing import record', async () => {
      importService.getImportStatus.mockResolvedValue(null);

      const result = await controller.getImportStatus('import-123');

      expect(importService.getImportStatus).toHaveBeenCalledWith('import-123');
      expect(result).toEqual({
        success: false,
        message: 'Import record not found',
        data: undefined,
      });
    });
  });

  describe('getImportHistory', () => {
    it('should get import history successfully', async () => {
      const mockHistory = [mockImportRecord];
      importService.getImportHistory.mockResolvedValue(mockHistory as any);

      const result = await controller.getImportHistory(mockRequest);

      expect(importService.getImportHistory).toHaveBeenCalledWith(mockUser.sub);
      expect(result).toEqual({
        success: true,
        message: 'Import history retrieved successfully',
        data: [mockStatusDto],
      });
    });

    it('should handle empty history', async () => {
      importService.getImportHistory.mockResolvedValue([]);

      const result = await controller.getImportHistory(mockRequest);

      expect(importService.getImportHistory).toHaveBeenCalledWith(mockUser.sub);
      expect(result).toEqual({
        success: true,
        message: 'Import history retrieved successfully',
        data: [],
      });
    });
  });
});
