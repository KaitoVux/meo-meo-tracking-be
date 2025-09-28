import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportService } from './services/import.service';
import { ImportPreviewDto, ImportStatusDto, ImportStatus } from './dto';
import { ApiResponse as ApiResponseDto } from '../common/dto/api-response.dto';

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Preview import file and validate data' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'File preview with validation results',
    type: ImportPreviewDto,
  })
  async previewFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ): Promise<ApiResponseDto<ImportPreviewDto>> {
    const preview = await this.importService.previewFile(file, req.user.sub);

    return {
      success: true,
      message: 'File preview generated successfully',
      data: preview,
    };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and start processing import file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Import started successfully',
    type: ImportStatusDto,
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ): Promise<ApiResponseDto<ImportStatusDto>> {
    const importRecord = await this.importService.importFile(
      file,
      req.user.sub,
    );

    const statusDto: ImportStatusDto = {
      id: importRecord.id,
      fileName: importRecord.fileName,
      status: importRecord.status,
      progress: importRecord.progress,
      totalRows: importRecord.totalRows,
      processedRows: importRecord.processedRows,
      successfulRows: importRecord.successfulRows,
      errorRows: importRecord.errorRows,
      createdAt: importRecord.createdAt,
      completedAt: importRecord.completedAt,
    };

    return {
      success: true,
      message: 'Import started successfully',
      data: statusDto,
    };
  }

  @Get('status/:id')
  @ApiOperation({ summary: 'Get import status by ID' })
  @ApiResponse({
    status: 200,
    description: 'Import status retrieved successfully',
    type: ImportStatusDto,
  })
  async getImportStatus(
    @Param('id') importId: string,
  ): Promise<ApiResponseDto<ImportStatusDto>> {
    const importRecord = await this.importService.getImportStatus(importId);

    if (!importRecord) {
      return {
        success: false,
        message: 'Import record not found',
        data: undefined,
      };
    }

    const statusDto: ImportStatusDto = {
      id: importRecord.id,
      fileName: importRecord.fileName,
      status: importRecord.status,
      progress: importRecord.progress,
      totalRows: importRecord.totalRows,
      processedRows: importRecord.processedRows,
      successfulRows: importRecord.successfulRows,
      errorRows: importRecord.errorRows,
      createdAt: importRecord.createdAt,
      completedAt: importRecord.completedAt,
    };

    return {
      success: true,
      message: 'Import status retrieved successfully',
      data: statusDto,
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get import history for current user' })
  @ApiResponse({
    status: 200,
    description: 'Import history retrieved successfully',
    type: [ImportStatusDto],
  })
  async getImportHistory(
    @Request() req: any,
  ): Promise<ApiResponseDto<ImportStatusDto[]>> {
    const importRecords = await this.importService.getImportHistory(
      req.user.sub,
    );

    const historyDto: ImportStatusDto[] = importRecords.map((record) => ({
      id: record.id,
      fileName: record.fileName,
      status: record.status,
      progress: record.progress,
      totalRows: record.totalRows,
      processedRows: record.processedRows,
      successfulRows: record.successfulRows,
      errorRows: record.errorRows,
      createdAt: record.createdAt,
      completedAt: record.completedAt,
    }));

    return {
      success: true,
      message: 'Import history retrieved successfully',
      data: historyDto,
    };
  }
}
