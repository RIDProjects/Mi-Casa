import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class AddCategoryDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsInt() sortOrder?: number;
}
