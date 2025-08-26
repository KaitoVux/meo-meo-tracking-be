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
import { ResponseHelper } from '../common/decorators/api-response.decorator';

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
  ) {
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

    const responseData = new FileUploadResponseDto(
      result.file,
      result.googleDriveFile,
    );
    return ResponseHelper.created(responseData, 'File uploaded successfully');
  }

  @Get(':id')
  async getFile(@Param('id') id: string) {
    const file = await this.filesService.getFile(id);
    const responseData = new FileResponseDto(file);
    return ResponseHelper.success(responseData);
  }

  @Get(':id/details')
  async getFileWithGoogleDriveInfo(@Param('id') id: string) {
    const { file, googleDriveFile } =
      await this.filesService.getFileWithGoogleDriveInfo(id);
    const responseData = {
      file: new FileResponseDto(file),
      googleDriveFile,
    };
    return ResponseHelper.success(responseData);
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    await this.filesService.deleteFile(id, user);
    return ResponseHelper.deleted('File deleted successfully');
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

    const responseData = files.map((file) => new FileResponseDto(file));
    const pagination = {
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    };

    return ResponseHelper.paginated(responseData, pagination);
  }

  @Get('drive/status')
  async checkGoogleDriveConnection() {
    const isConnected = await this.filesService.checkGoogleDriveConnection();
    const responseData = {
      connected: isConnected,
      status: isConnected ? 'Connected' : 'Disconnected',
    };
    return ResponseHelper.success(responseData);
  }

  @Get('drive/folder-info')
  async getGoogleDriveFolderInfo() {
    const folderInfo = await this.filesService.getGoogleDriveFolderInfo();
    return ResponseHelper.success({ folder: folderInfo });
  }
}
