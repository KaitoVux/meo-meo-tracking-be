import { File } from '../../entities/file.entity';

export class FileResponseDto {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: string;
  googleDriveUrl: string;
  createdAt: Date;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };

  constructor(file: File) {
    this.id = file.id;
    this.filename = file.filename;
    this.originalName = file.originalName;
    this.mimeType = file.mimeType;
    this.size = file.size.toString();
    this.googleDriveUrl = file.googleDriveUrl;
    this.createdAt = file.createdAt;
    this.uploadedBy = {
      id: file.uploadedBy.id,
      name: file.uploadedBy.name,
      email: file.uploadedBy.email,
    };
  }
}

export class FileUploadResponseDto {
  success: boolean;
  file: FileResponseDto;
  googleDriveFile: {
    id: string;
    name: string;
    webViewLink: string;
    webContentLink: string;
    size: string;
    mimeType: string;
  };

  constructor(
    file: File,
    googleDriveFile: {
      id: string;
      name: string;
      webViewLink: string;
      webContentLink: string;
      size: string;
      mimeType: string;
    },
  ) {
    this.success = true;
    this.file = new FileResponseDto(file);
    this.googleDriveFile = googleDriveFile;
  }
}
