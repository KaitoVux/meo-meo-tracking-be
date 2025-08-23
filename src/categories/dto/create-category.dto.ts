import {
  IsString,
  IsOptional,
  IsBoolean,
  Length,
  Matches,
  IsUUID,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(2, 100, {
    message: 'Category name must be between 2 and 100 characters',
  })
  name!: string;

  @IsString()
  @Length(2, 20, {
    message: 'Category code must be between 2 and 20 characters',
  })
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'Code must contain only uppercase letters, numbers, and underscores',
  })
  code!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsUUID(4, { message: 'Parent ID must be a valid UUID' })
  parentId?: string;
}
