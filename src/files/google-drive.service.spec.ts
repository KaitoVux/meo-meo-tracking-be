import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GoogleDriveService, UploadFileOptions } from './google-drive.service';
import { google } from 'googleapis';

// Mock googleapis
jest.mock('googleapis');
const mockGoogle = google as jest.Mocked<typeof google>;

describe('GoogleDriveService', () => {
  let service: GoogleDriveService;
  let mockDrive: any; // Google Drive API mock is complex, using any for test
  let mockAuth: any; // Google Auth mock is complex, using any for test

  beforeEach(async () => {
    // Reset environment variables
    process.env.GOOGLE_DRIVE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_DRIVE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_DRIVE_REDIRECT_URI =
      'http://localhost:3001/auth/google/callback';
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN = 'test-refresh-token';
    process.env.GOOGLE_DRIVE_FOLDER_ID = 'test-folder-id';

    // Mock Google Drive API
    mockDrive = {
      files: {
        create: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
      },
      permissions: {
        create: jest.fn(),
      },
      about: {
        get: jest.fn(),
      },
    };

    mockAuth = {
      setCredentials: jest.fn(),
    };

    mockGoogle.auth.OAuth2 = jest.fn().mockImplementation(() => mockAuth);
    mockGoogle.drive = jest.fn().mockReturnValue(mockDrive);

    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleDriveService],
    }).compile();

    service = module.get<GoogleDriveService>(GoogleDriveService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize Google Drive API successfully', () => {
      expect(mockGoogle.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'http://localhost:3001/auth/google/callback',
      );
      expect(mockAuth.setCredentials).toHaveBeenCalledWith({
        refresh_token: 'test-refresh-token',
      });
      expect(mockGoogle.drive).toHaveBeenCalledWith({
        version: 'v3',
        auth: mockAuth,
      });
    });

    it('should throw BadRequestException when initialization fails', () => {
      // Clear environment variables to simulate configuration error
      delete process.env.GOOGLE_DRIVE_CLIENT_ID;

      expect(() => {
        new GoogleDriveService();
      }).toThrow(BadRequestException);
    });
  });

  describe('uploadFile', () => {
    const mockUploadOptions: UploadFileOptions = {
      filename: 'test-file.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test content'),
      folderId: 'custom-folder-id',
    };

    const mockGoogleDriveResponse = {
      data: {
        id: 'test-file-id',
        name: 'test-file.pdf',
        webViewLink: 'https://drive.google.com/file/d/test-file-id/view',
        webContentLink: 'https://drive.google.com/uc?id=test-file-id',
        size: '12',
        mimeType: 'application/pdf',
      },
    };

    it('should upload file successfully', async () => {
      mockDrive.files.create.mockResolvedValue(mockGoogleDriveResponse);
      mockDrive.permissions.create.mockResolvedValue({});

      const result = await service.uploadFile(mockUploadOptions);

      expect(mockDrive.files.create).toHaveBeenCalledWith({
        requestBody: {
          name: 'test-file.pdf',
          parents: ['custom-folder-id'],
        },
        media: {
          mimeType: 'application/pdf',
          body: expect.any(Object),
        },
        fields: 'id,name,webViewLink,webContentLink,size,mimeType',
      });

      expect(mockDrive.permissions.create).toHaveBeenCalledWith({
        fileId: 'test-file-id',
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      expect(result).toEqual({
        id: 'test-file-id',
        name: 'test-file.pdf',
        webViewLink: 'https://drive.google.com/file/d/test-file-id/view',
        webContentLink: 'https://drive.google.com/uc?id=test-file-id',
        size: '12',
        mimeType: 'application/pdf',
      });
    });

    it('should use default folder when no folderId provided', async () => {
      const optionsWithoutFolder = { ...mockUploadOptions };
      delete optionsWithoutFolder.folderId;

      mockDrive.files.create.mockResolvedValue(mockGoogleDriveResponse);
      mockDrive.permissions.create.mockResolvedValue({});

      await service.uploadFile(optionsWithoutFolder);

      expect(mockDrive.files.create).toHaveBeenCalledWith({
        requestBody: {
          name: 'test-file.pdf',
          parents: ['test-folder-id'],
        },
        media: {
          mimeType: 'application/pdf',
          body: expect.any(Object),
        },
        fields: 'id,name,webViewLink,webContentLink,size,mimeType',
      });
    });

    it('should throw BadRequestException when upload fails', async () => {
      mockDrive.files.create.mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadFile(mockUploadOptions)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getFile', () => {
    const mockFileResponse = {
      data: {
        id: 'test-file-id',
        name: 'test-file.pdf',
        webViewLink: 'https://drive.google.com/file/d/test-file-id/view',
        webContentLink: 'https://drive.google.com/uc?id=test-file-id',
        size: '12',
        mimeType: 'application/pdf',
      },
    };

    it('should get file successfully', async () => {
      mockDrive.files.get.mockResolvedValue(mockFileResponse);

      const result = await service.getFile('test-file-id');

      expect(mockDrive.files.get).toHaveBeenCalledWith({
        fileId: 'test-file-id',
        fields: 'id,name,webViewLink,webContentLink,size,mimeType',
      });

      expect(result).toEqual({
        id: 'test-file-id',
        name: 'test-file.pdf',
        webViewLink: 'https://drive.google.com/file/d/test-file-id/view',
        webContentLink: 'https://drive.google.com/uc?id=test-file-id',
        size: '12',
        mimeType: 'application/pdf',
      });
    });

    it('should throw BadRequestException when get fails', async () => {
      mockDrive.files.get.mockRejectedValue(new Error('File not found'));

      await expect(service.getFile('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockDrive.files.delete.mockResolvedValue({});

      await service.deleteFile('test-file-id');

      expect(mockDrive.files.delete).toHaveBeenCalledWith({
        fileId: 'test-file-id',
      });
    });

    it('should throw BadRequestException when delete fails', async () => {
      mockDrive.files.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteFile('test-file-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('checkConnection', () => {
    it('should return true when connection is successful', async () => {
      mockDrive.about.get.mockResolvedValue({});

      const result = await service.checkConnection();

      expect(result).toBe(true);
      expect(mockDrive.about.get).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      mockDrive.about.get.mockRejectedValue(new Error('Connection failed'));

      const result = await service.checkConnection();

      expect(result).toBe(false);
    });
  });

  describe('getFolderInfo', () => {
    const mockFolderResponse = {
      data: {
        id: 'test-folder-id',
        name: 'Test Folder',
        webViewLink: 'https://drive.google.com/drive/folders/test-folder-id',
      },
    };

    it('should get folder info successfully', async () => {
      mockDrive.files.get.mockResolvedValue(mockFolderResponse);

      const result = await service.getFolderInfo();

      expect(mockDrive.files.get).toHaveBeenCalledWith({
        fileId: 'test-folder-id',
        fields: 'id,name,webViewLink',
      });

      expect(result).toEqual(mockFolderResponse.data);
    });

    it('should get custom folder info when folderId provided', async () => {
      mockDrive.files.get.mockResolvedValue(mockFolderResponse);

      await service.getFolderInfo('custom-folder-id');

      expect(mockDrive.files.get).toHaveBeenCalledWith({
        fileId: 'custom-folder-id',
        fields: 'id,name,webViewLink',
      });
    });

    it('should throw BadRequestException when get folder info fails', async () => {
      mockDrive.files.get.mockRejectedValue(new Error('Folder not found'));

      await expect(service.getFolderInfo()).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
