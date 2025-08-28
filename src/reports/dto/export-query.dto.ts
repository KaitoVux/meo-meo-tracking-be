import { IsEnum, IsOptional } from 'class-validator';
import { ReportQueryDto } from './report-query.dto';

export enum ExportFormat {
  EXCEL = 'excel',
  CSV = 'csv',
  PDF = 'pdf',
}

export class ExportQueryDto extends ReportQueryDto {
  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @IsOptional()
  @IsEnum(['summary', 'detailed'])
  reportType?: 'summary' | 'detailed';
}
