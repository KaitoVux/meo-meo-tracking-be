import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { File } from '../entities/file.entity';
import { User, UserRole } from '../entities/user.entity';
import { GoogleDriveService, UploadFileOptions } from './google-drive.service';

export interface FileUploadResult {
  file: File;
  googleDriveFile: {
    id: string;
    name: string;
    webViewLink: string;
    webContentLink: string;
    size: string;
    mimeType: string;
  };
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: EntityRepository<File>,
    private readonly googleDriveService: GoogleDriveService,
    private readonly em: EntityManager,
  ) {}

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    user: User,
    folderId?: string,
  ): Promise<FileUploadResult> {
    try {
      // Validate file type (accept all formats except Excel and Docs as per requirements)
      if (this.isRestrictedFileType(mimeType, originalName)) {
        throw new BadRequestException('Excel and Docs files are not allowed');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}_${originalName}`;

      // Upload to Google Drive
      const uploadOptions: UploadFileOptions = {
        filename,
        mimeType,
        buffer: fileBuffer,
        folderId,
      };

      const googleDriveFile =
        await this.googleDriveService.uploadFile(uploadOptions);

      // Create file metadata record
      const file = new File();
      file.filename = filename;
      file.originalName = originalName;
      file.mimeType = mimeType;
      file.size = Number(fileBuffer.length);
      file.googleDriveId = googleDriveFile.id;
      file.googleDriveUrl = googleDriveFile.webViewLink;
      file.uploadedBy = user;

      this.em.persist(file);
      await this.em.flush();

      this.logger.log(`File uploaded and saved: ${file.id} - ${originalName}`);

      return {
        file,
        googleDriveFile,
      };
    } catch (error) {
      this.logger.error('Failed to upload file', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload file');
    }
  }

  async getFile(fileId: string): Promise<File> {
    const file = await this.fileRepository.findOne(
      { id: fileId },
      { populate: ['uploadedBy'] },
    );

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async getFileWithGoogleDriveInfo(fileId: string): Promise<{
    file: File;
    googleDriveFile: {
      id: string;
      name: string;
      webViewLink: string;
      webContentLink: string;
      size: string;
      mimeType: string;
    } | null;
  }> {
    const file = await this.getFile(fileId);

    try {
      const googleDriveFile = await this.googleDriveService.getFile(
        file.googleDriveId,
      );
      return { file, googleDriveFile };
    } catch (error) {
      this.logger.error(
        `Failed to get Google Drive info for file ${fileId}`,
        error,
      );
      return { file, googleDriveFile: null };
    }
  }

  async deleteFile(fileId: string, user: User): Promise<void> {
    const file = await this.fileRepository.findOne(
      { id: fileId },
      { populate: ['uploadedBy'] },
    );

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check if user has permission to delete (owner or admin)
    if (file.uploadedBy.id !== user.id && user.role !== UserRole.ACCOUNTANT) {
      throw new BadRequestException(
        'You do not have permission to delete this file',
      );
    }

    try {
      // Delete from Google Drive
      await this.googleDriveService.deleteFile(file.googleDriveId);
    } catch (error) {
      this.logger.warn(
        `Failed to delete file from Google Drive: ${file.googleDriveId}`,
        error,
      );
      // Continue with soft delete even if Google Drive deletion fails
    }

    // Soft delete the file record
    file.deletedAt = new Date();
    this.em.persist(file);
    await this.em.flush();

    this.logger.log(`File deleted: ${fileId}`);
  }

  async getUserFiles(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ files: File[]; total: number }> {
    const [files, total] = await this.fileRepository.findAndCount(
      { uploadedBy: userId },
      {
        populate: ['uploadedBy'],
        limit,
        offset,
        orderBy: { createdAt: 'DESC' },
      },
    );

    return { files, total };
  }

  async checkGoogleDriveConnection(): Promise<boolean> {
    return this.googleDriveService.checkConnection();
  }

  async getGoogleDriveFolderInfo(): Promise<{
    id: string;
    name: string;
    webViewLink: string;
  }> {
    const folderInfo = await this.googleDriveService.getFolderInfo();
    return folderInfo as { id: string; name: string; webViewLink: string };
  }

  private isRestrictedFileType(mimeType: string, filename: string): boolean {
    const restrictedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const restrictedExtensions = ['.xls', '.xlsx', '.doc', '.docx'];

    // Check MIME type
    if (restrictedMimeTypes.includes(mimeType)) {
      return true;
    }

    // Check file extension
    const lowerFilename = filename.toLowerCase();
    return restrictedExtensions.some((ext) => lowerFilename.endsWith(ext));
  }
}
