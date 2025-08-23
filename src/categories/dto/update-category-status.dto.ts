import { IsBoolean } from 'class-validator';

export class UpdateCategoryStatusDto {
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive!: boolean;
}
