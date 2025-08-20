import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

export interface GoogleDriveFile {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink: string;
  size: string;
  mimeType: string;
}

export interface UploadFileOptions {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  folderId?: string;
}

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive: drive_v3.Drive;

  constructor() {
    this.initializeGoogleDrive();
  }

  private initializeGoogleDrive() {
    try {
      // Validate required environment variables
      if (
        !process.env.GOOGLE_DRIVE_CLIENT_ID ||
        !process.env.GOOGLE_DRIVE_CLIENT_SECRET ||
        !process.env.GOOGLE_DRIVE_REDIRECT_URI ||
        !process.env.GOOGLE_DRIVE_REFRESH_TOKEN
      ) {
        throw new Error('Missing required Google Drive configuration');
      }

      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_DRIVE_CLIENT_ID,
        process.env.GOOGLE_DRIVE_CLIENT_SECRET,
        process.env.GOOGLE_DRIVE_REDIRECT_URI,
      );

      auth.setCredentials({
        refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.logger.log('Google Drive API initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google Drive API', error);
      //   throw new BadRequestException('Google Drive configuration error');
    }
  }

  async uploadFile(options: UploadFileOptions): Promise<GoogleDriveFile> {
    try {
      const { filename, mimeType, buffer, folderId } = options;

      const fileMetadata: drive_v3.Schema$File = {
        name: filename,
        parents: folderId
          ? [folderId]
          : process.env.GOOGLE_DRIVE_FOLDER_ID
            ? [process.env.GOOGLE_DRIVE_FOLDER_ID]
            : undefined,
      };

      const media = {
        mimeType,
        body: Readable.from(buffer),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id,name,webViewLink,webContentLink,size,mimeType',
      });

      const file = response.data;

      // Make the file publicly viewable
      await this.drive.permissions.create({
        fileId: file.id!,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      this.logger.log(`File uploaded successfully: ${file.name} (${file.id})`);

      return {
        id: file.id!,
        name: file.name!,
        webViewLink: file.webViewLink!,
        webContentLink: file.webContentLink!,
        size: file.size!,
        mimeType: file.mimeType!,
      };
    } catch (error) {
      this.logger.error('Failed to upload file to Google Drive', error);
      throw new BadRequestException('Failed to upload file to Google Drive');
    }
  }

  async getFile(fileId: string): Promise<GoogleDriveFile> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id,name,webViewLink,webContentLink,size,mimeType',
      });

      const file = response.data;

      return {
        id: file.id!,
        name: file.name!,
        webViewLink: file.webViewLink!,
        webContentLink: file.webContentLink!,
        size: file.size!,
        mimeType: file.mimeType!,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get file from Google Drive: ${fileId}`,
        error,
      );
      throw new BadRequestException(
        'Failed to retrieve file from Google Drive',
      );
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId,
      });

      this.logger.log(`File deleted successfully: ${fileId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete file from Google Drive: ${fileId}`,
        error,
      );
      throw new BadRequestException('Failed to delete file from Google Drive');
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.drive.about.get();
      return true;
    } catch (error) {
      this.logger.error('Google Drive connection check failed', error);
      return false;
    }
  }

  async getFolderInfo(
    folderId?: string,
  ): Promise<{ id: string; name: string; webViewLink: string }> {
    try {
      const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
      const response = await this.drive.files.get({
        fileId: targetFolderId,
        fields: 'id,name,webViewLink',
      });

      return {
        id: response.data.id!,
        name: response.data.name!,
        webViewLink: response.data.webViewLink!,
      };
    } catch (error) {
      this.logger.error('Failed to get folder info', error);
      throw new BadRequestException('Failed to get folder information');
    }
  }
}
