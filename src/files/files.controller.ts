import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { User as UserEntity } from '../entities/user.entity';
import { FilesService } from './files.service';
import {
  FileResponseDto,
  FileUploadResponseDto,
} from './dto/file-response.dto';

@Controller('api/files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserEntity,
    @Query('folderId') folderId?: string,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.filesService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      user,
      folderId,
    );

    return new FileUploadResponseDto(result.file, result.googleDriveFile);
  }

  @Get(':id')
  async getFile(@Param('id') id: string): Promise<FileResponseDto> {
    const file = await this.filesService.getFile(id);
    return new FileResponseDto(file);
  }

  @Get(':id/details')
  async getFileWithGoogleDriveInfo(@Param('id') id: string) {
    const { file, googleDriveFile } =
      await this.filesService.getFileWithGoogleDriveInfo(id);
    return {
      file: new FileResponseDto(file),
      googleDriveFile,
    };
  }

  @Delete(':id')
  async deleteFile(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<{ success: boolean; message: string }> {
    await this.filesService.deleteFile(id, user);
    return {
      success: true,
      message: 'File deleted successfully',
    };
  }

  @Get()
  async getUserFiles(
    @CurrentUser() user: UserEntity,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    const { files, total } = await this.filesService.getUserFiles(
      user.id,
      Number(limit),
      Number(offset),
    );

    return {
      files: files.map((file) => new FileResponseDto(file)),
      total,
      limit: Number(limit),
      offset: Number(offset),
    };
  }

  @Get('drive/status')
  async checkGoogleDriveConnection() {
    const isConnected = await this.filesService.checkGoogleDriveConnection();
    return {
      connected: isConnected,
      status: isConnected ? 'Connected' : 'Disconnected',
    };
  }

  @Get('drive/folder-info')
  async getGoogleDriveFolderInfo() {
    const folderInfo = await this.filesService.getGoogleDriveFolderInfo();
    return {
      folder: folderInfo,
    };
  }
}
