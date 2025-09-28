import { ApiProperty } from '@nestjs/swagger';

export class ImportError {
  @ApiProperty({ description: 'Row number with error' })
  row: number;

  @ApiProperty({ description: 'Field name with error' })
  field: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Invalid value', required: false })
  value?: string;
}

export class ImportPreviewDto {
  @ApiProperty({ description: 'File name' })
  fileName: string;

  @ApiProperty({ description: 'Total number of rows' })
  totalRows: number;

  @ApiProperty({ description: 'Column headers', type: [String] })
  headers: string[];

  @ApiProperty({ description: 'Sample data rows' })
  sampleData: Record<string, string>[];

  @ApiProperty({ description: 'Validation errors', type: [ImportError] })
  errors: ImportError[];
}
