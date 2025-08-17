import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FilesService } from './files.service';
import { GoogleDriveService } from './google-drive.service';
import { File } from '../entities/file.entity';
import { User, UserRole } from '../entities/user.entity';

describe('FilesService', () => {
  let service: FilesService;
  let fileRepository: jest.Mocked<EntityRepository<File>>;
  let googleDriveService: jest.Mocked<GoogleDriveService>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    expenses: {} as any, // Collection type is complex, using any for test
  };

  const mockFile: File = {
    id: 'file-1',
    filename: '1234567890_test.pdf',
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    size: BigInt(1024),
    googleDriveId: 'drive-file-1',
    googleDriveUrl: 'https://drive.google.com/file/d/drive-file-1/view',
    createdAt: new Date(),
    deletedAt: undefined,
    uploadedBy: mockUser,
    expenses: {} as any, // Collection type is complex, using any for test
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
    const mockFileRepository = {
      create: jest.fn(),
      persistAndFlush: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };

    const mockGoogleDriveService = {
      uploadFile: jest.fn(),
      getFile: jest.fn(),
      deleteFile: jest.fn(),
      checkConnection: jest.fn(),
      getFolderInfo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(File),
          useValue: mockFileRepository,
        },
        {
          provide: GoogleDriveService,
          useValue: mockGoogleDriveService,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    fileRepository = module.get(getRepositoryToken(File));
    googleDriveService = module.get(GoogleDriveService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    const fileBuffer = Buffer.from('test file content');
    const originalName = 'test.pdf';
    const mimeType = 'application/pdf';

    it('should upload file successfully', async () => {
      googleDriveService.uploadFile.mockResolvedValue(mockGoogleDriveFile);
      fileRepository.create.mockReturnValue(mockFile);
      fileRepository.persistAndFlush.mockResolvedValue();

      const result = await service.uploadFile(
        fileBuffer,
        originalName,
        mimeType,
        mockUser,
      );

      expect(googleDriveService.uploadFile).toHaveBeenCalledWith({
        filename: expect.stringMatching(/^\d+_test\.pdf$/),
        mimeType,
        buffer: fileBuffer,
        folderId: undefined,
      });

      expect(fileRepository.create).toHaveBeenCalledWith({
        filename: expect.stringMatching(/^\d+_test\.pdf$/),
        originalName,
        mimeType,
        size: BigInt(fileBuffer.length),
        googleDriveId: mockGoogleDriveFile.id,
        googleDriveUrl: mockGoogleDriveFile.webViewLink,
        uploadedBy: mockUser,
      });

      expect(fileRepository.persistAndFlush).toHaveBeenCalledWith(mockFile);

      expect(result).toEqual({
        file: mockFile,
        googleDriveFile: mockGoogleDriveFile,
      });
    });

    it('should upload file with custom folder', async () => {
      const folderId = 'custom-folder-id';
      googleDriveService.uploadFile.mockResolvedValue(mockGoogleDriveFile);
      fileRepository.create.mockReturnValue(mockFile);
      fileRepository.persistAndFlush.mockResolvedValue();

      await service.uploadFile(
        fileBuffer,
        originalName,
        mimeType,
        mockUser,
        folderId,
      );

      expect(googleDriveService.uploadFile).toHaveBeenCalledWith({
        filename: expect.stringMatching(/^\d+_test\.pdf$/),
        mimeType,
        buffer: fileBuffer,
        folderId,
      });
    });

    it('should reject Excel files', async () => {
      await expect(
        service.uploadFile(
          fileBuffer,
          'test.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject Word documents', async () => {
      await expect(
        service.uploadFile(
          fileBuffer,
          'test.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files with Excel extensions regardless of MIME type', async () => {
      await expect(
        service.uploadFile(
          fileBuffer,
          'test.xls',
          'application/octet-stream',
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle Google Drive upload failure', async () => {
      googleDriveService.uploadFile.mockRejectedValue(
        new Error('Upload failed'),
      );

      await expect(
        service.uploadFile(fileBuffer, originalName, mimeType, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFile', () => {
    it('should get file successfully', async () => {
      fileRepository.findOne.mockResolvedValue(mockFile);

      const result = await service.getFile('file-1');

      expect(fileRepository.findOne).toHaveBeenCalledWith(
        { id: 'file-1' },
        { populate: ['uploadedBy'] },
      );
      expect(result).toEqual(mockFile);
    });

    it('should throw NotFoundException when file not found', async () => {
      fileRepository.findOne.mockResolvedValue(null);

      await expect(service.getFile('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFileWithGoogleDriveInfo', () => {
    it('should get file with Google Drive info successfully', async () => {
      fileRepository.findOne.mockResolvedValue(mockFile);
      googleDriveService.getFile.mockResolvedValue(mockGoogleDriveFile);

      const result = await service.getFileWithGoogleDriveInfo('file-1');

      expect(googleDriveService.getFile).toHaveBeenCalledWith(
        mockFile.googleDriveId,
      );
      expect(result).toEqual({
        file: mockFile,
        googleDriveFile: mockGoogleDriveFile,
      });
    });

    it('should handle Google Drive API failure gracefully', async () => {
      fileRepository.findOne.mockResolvedValue(mockFile);
      googleDriveService.getFile.mockRejectedValue(
        new Error('Drive API failed'),
      );

      const result = await service.getFileWithGoogleDriveInfo('file-1');

      expect(result).toEqual({
        file: mockFile,
        googleDriveFile: null,
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully as owner', async () => {
      fileRepository.findOne.mockResolvedValue(mockFile);
      googleDriveService.deleteFile.mockResolvedValue();
      fileRepository.persistAndFlush.mockResolvedValue();

      await service.deleteFile('file-1', mockUser);

      expect(googleDriveService.deleteFile).toHaveBeenCalledWith(
        mockFile.googleDriveId,
      );
      expect(mockFile.deletedAt).toBeInstanceOf(Date);
      expect(fileRepository.persistAndFlush).toHaveBeenCalledWith(mockFile);
    });

    it('should delete file successfully as accountant', async () => {
      const accountantUser = { ...mockUser, role: UserRole.ACCOUNTANT };
      const fileByOtherUser = {
        ...mockFile,
        uploadedBy: { ...mockUser, id: 'other-user' },
      };

      fileRepository.findOne.mockResolvedValue(fileByOtherUser);
      googleDriveService.deleteFile.mockResolvedValue();
      fileRepository.persistAndFlush.mockResolvedValue();

      await service.deleteFile('file-1', accountantUser);

      expect(googleDriveService.deleteFile).toHaveBeenCalledWith(
        fileByOtherUser.googleDriveId,
      );
    });

    it('should throw BadRequestException when user lacks permission', async () => {
      const otherUser = { ...mockUser, id: 'other-user' };
      fileRepository.findOne.mockResolvedValue(mockFile);

      await expect(service.deleteFile('file-1', otherUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when file not found', async () => {
      fileRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteFile('invalid-id', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should continue with soft delete even if Google Drive deletion fails', async () => {
      fileRepository.findOne.mockResolvedValue(mockFile);
      googleDriveService.deleteFile.mockRejectedValue(
        new Error('Drive deletion failed'),
      );
      fileRepository.persistAndFlush.mockResolvedValue();

      await service.deleteFile('file-1', mockUser);

      expect(mockFile.deletedAt).toBeInstanceOf(Date);
      expect(fileRepository.persistAndFlush).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('getUserFiles', () => {
    it('should get user files with pagination', async () => {
      const files = [mockFile];
      const total = 1;
      fileRepository.findAndCount.mockResolvedValue([files, total]);

      const result = await service.getUserFiles('user-1', 10, 0);

      expect(fileRepository.findAndCount).toHaveBeenCalledWith(
        { uploadedBy: 'user-1' },
        {
          populate: ['uploadedBy'],
          limit: 10,
          offset: 0,
          orderBy: { createdAt: 'DESC' },
        },
      );

      expect(result).toEqual({ files, total });
    });

    it('should use default pagination values', async () => {
      fileRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getUserFiles('user-1');

      expect(fileRepository.findAndCount).toHaveBeenCalledWith(
        { uploadedBy: 'user-1' },
        {
          populate: ['uploadedBy'],
          limit: 50,
          offset: 0,
          orderBy: { createdAt: 'DESC' },
        },
      );
    });
  });

  describe('checkGoogleDriveConnection', () => {
    it('should return connection status', async () => {
      googleDriveService.checkConnection.mockResolvedValue(true);

      const result = await service.checkGoogleDriveConnection();

      expect(result).toBe(true);
      expect(googleDriveService.checkConnection).toHaveBeenCalled();
    });
  });

  describe('getGoogleDriveFolderInfo', () => {
    it('should return folder info', async () => {
      const folderInfo = { id: 'folder-1', name: 'Test Folder' };
      googleDriveService.getFolderInfo.mockResolvedValue(folderInfo);

      const result = await service.getGoogleDriveFolderInfo();

      expect(result).toEqual(folderInfo);
      expect(googleDriveService.getFolderInfo).toHaveBeenCalled();
    });
  });
});
