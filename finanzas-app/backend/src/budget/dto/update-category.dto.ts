import { PartialType } from '@nestjs/swagger';
import { AddCategoryDto } from './add-category.dto';

export class UpdateCategoryDto extends PartialType(AddCategoryDto) {}
