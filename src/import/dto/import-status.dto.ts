import { ApiProperty } from '@nestjs/swagger';

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class ImportStatusDto {
  @ApiProperty({ description: 'Import record ID' })
  id: string;

  @ApiProperty({ description: 'File name' })
  fileName: string;

  @ApiProperty({ enum: ImportStatus, description: 'Import status' })
  status: ImportStatus;

  @ApiProperty({ description: 'Progress percentage' })
  progress: number;

  @ApiProperty({ description: 'Total rows to process' })
  totalRows: number;

  @ApiProperty({ description: 'Number of processed rows' })
  processedRows: number;

  @ApiProperty({ description: 'Number of successfully imported rows' })
  successfulRows: number;

  @ApiProperty({ description: 'Number of rows with errors' })
  errorRows: number;

  @ApiProperty({ description: 'Import start time' })
  createdAt: Date;

  @ApiProperty({ description: 'Import completion time', required: false })
  completedAt?: Date;
}
