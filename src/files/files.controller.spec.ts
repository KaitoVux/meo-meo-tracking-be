import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { User } from '../entities/user.entity';
import { File } from '../entities/file.entity';

describe('FilesController', () => {
  let controller: FilesController;
  let filesService: jest.Mocked<FilesService>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER' as any,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    expenses: {} as any,
    password: '',
  };

  const mockFile: File = {
    id: 'file-1',
    filename: '1234567890_test.pdf',
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    googleDriveId: 'drive-file-1',
    googleDriveUrl: 'https://drive.google.com/file/d/drive-file-1/view',
    createdAt: new Date(),
    deletedAt: undefined,
    uploadedBy: mockUser,
    expenses: {} as any,
  };

  const mockGoogleDriveFile = {
    id: 'drive-file-1',
    name: '1234567890_test.pdf',
    webViewLink: 'https://drive.google.com/file/d/drive-file-1/view',
    webContentLink: 'https://drive.google.com/uc?id=drive-file-1',
    size: '1024',
    mimeType: 'application/pdf',
  };

  beforeEach(async () => {
    const mockFilesService = {
      uploadFile: jest.fn(),
      getFile: jest.fn(),
      getFileWithGoogleDriveInfo: jest.fn(),
      deleteFile: jest.fn(),
      getUserFiles: jest.fn(),
      checkGoogleDriveConnection: jest.fn(),
      getGoogleDriveFolderInfo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
    filesService = module.get(FilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    const mockMulterFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test content'),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
    };

    it('should upload file successfully', async () => {
      const uploadResult = {
        file: mockFile,
        googleDriveFile: mockGoogleDriveFile,
      };

      filesService.uploadFile.mockResolvedValue(uploadResult);

      const result = await controller.uploadFile(mockMulterFile, mockUser);

      expect(filesService.uploadFile).toHaveBeenCalledWith(
        mockMulterFile.buffer,
        mockMulterFile.originalname,
        mockMulterFile.mimetype,
        mockUser,
        undefined,
      );

      expect(result).toEqual({
        success: true,
        file: {
          id: mockFile.id,
          filename: mockFile.filename,
          originalName: mockFile.originalName,
          mimeType: mockFile.mimeType,
          size: mockFile.size.toString(),
          googleDriveUrl: mockFile.googleDriveUrl,
          createdAt: mockFile.createdAt,
          uploadedBy: {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
          },
        },
        googleDriveFile: mockGoogleDriveFile,
      });
    });

    it('should upload file with custom folder', async () => {
      const uploadResult = {
        file: mockFile,
        googleDriveFile: mockGoogleDriveFile,
      };

      filesService.uploadFile.mockResolvedValue(uploadResult);

      await controller.uploadFile(mockMulterFile, mockUser, 'custom-folder-id');

      expect(filesService.uploadFile).toHaveBeenCalledWith(
        mockMulterFile.buffer,
        mockMulterFile.originalname,
        mockMulterFile.mimetype,
        mockUser,
        'custom-folder-id',
      );
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(
        controller.uploadFile(
          undefined as unknown as Express.Multer.File,
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFile', () => {
    it('should get file successfully', async () => {
      filesService.getFile.mockResolvedValue(mockFile);

      const result = await controller.getFile('file-1');

      expect(filesService.getFile).toHaveBeenCalledWith('file-1');
      expect(result).toEqual({
        id: mockFile.id,
        filename: mockFile.filename,
        originalName: mockFile.originalName,
        mimeType: mockFile.mimeType,
        size: mockFile.size.toString(),
        googleDriveUrl: mockFile.googleDriveUrl,
        createdAt: mockFile.createdAt,
        uploadedBy: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
        },
      });
    });
  });

  describe('getFileWithGoogleDriveInfo', () => {
    it('should get file with Google Drive info successfully', async () => {
      filesService.getFileWithGoogleDriveInfo.mockResolvedValue({
        file: mockFile,
        googleDriveFile: mockGoogleDriveFile,
      });

      const result = await controller.getFileWithGoogleDriveInfo('file-1');

      expect(filesService.getFileWithGoogleDriveInfo).toHaveBeenCalledWith(
        'file-1',
      );
      expect(result).toEqual({
        file: {
          id: mockFile.id,
          filename: mockFile.filename,
          originalName: mockFile.originalName,
          mimeType: mockFile.mimeType,
          size: mockFile.size.toString(),
          googleDriveUrl: mockFile.googleDriveUrl,
          createdAt: mockFile.createdAt,
          uploadedBy: {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
          },
        },
        googleDriveFile: mockGoogleDriveFile,
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      filesService.deleteFile.mockResolvedValue();

      const result = await controller.deleteFile('file-1', mockUser);

      expect(filesService.deleteFile).toHaveBeenCalledWith('file-1', mockUser);
      expect(result).toEqual({
        success: true,
        message: 'File deleted successfully',
      });
    });
  });

  describe('getUserFiles', () => {
    it('should get user files with default pagination', async () => {
      const files = [mockFile];
      const total = 1;
      filesService.getUserFiles.mockResolvedValue({ files, total });

      const result = await controller.getUserFiles(mockUser);

      expect(filesService.getUserFiles).toHaveBeenCalledWith(
        mockUser.id,
        50,
        0,
      );
      expect(result).toEqual({
        files: [
          {
            id: mockFile.id,
            filename: mockFile.filename,
            originalName: mockFile.originalName,
            mimeType: mockFile.mimeType,
            size: mockFile.size.toString(),
            googleDriveUrl: mockFile.googleDriveUrl,
            createdAt: mockFile.createdAt,
            uploadedBy: {
              id: mockUser.id,
              name: mockUser.name,
              email: mockUser.email,
            },
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      });
    });

    it('should get user files with custom pagination', async () => {
      filesService.getUserFiles.mockResolvedValue({ files: [], total: 0 });

      await controller.getUserFiles(mockUser, 10, 20);

      expect(filesService.getUserFiles).toHaveBeenCalledWith(
        mockUser.id,
        10,
        20,
      );
    });
  });

  describe('checkGoogleDriveConnection', () => {
    it('should return connected status', async () => {
      filesService.checkGoogleDriveConnection.mockResolvedValue(true);

      const result = await controller.checkGoogleDriveConnection();

      expect(result).toEqual({
        connected: true,
        status: 'Connected',
      });
    });

    it('should return disconnected status', async () => {
      filesService.checkGoogleDriveConnection.mockResolvedValue(false);

      const result = await controller.checkGoogleDriveConnection();

      expect(result).toEqual({
        connected: false,
        status: 'Disconnected',
      });
    });
  });

  describe('getGoogleDriveFolderInfo', () => {
    it('should return folder info', async () => {
      const folderInfo = {
        id: 'folder-1',
        name: 'Test Folder',
        webViewLink: 'https://drive.google.com/drive/folders/folder-1',
      };

      filesService.getGoogleDriveFolderInfo.mockResolvedValue(folderInfo);

      const result = await controller.getGoogleDriveFolderInfo();

      expect(result).toEqual({
        folder: folderInfo,
      });
    });
  });
});
