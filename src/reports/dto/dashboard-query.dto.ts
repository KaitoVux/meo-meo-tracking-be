import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { Currency } from '../../entities/expense.entity';

export class DashboardQueryDto {
  @IsOptional()
  @IsString()
  month?: string; // Format: "YYYY-MM" or "September"

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsString()
  submitterId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeDeleted?: boolean;
}
