import { PartialType } from '@nestjs/swagger';
import { AddIncomeDto } from './add-income.dto';

export class UpdateIncomeDto extends PartialType(AddIncomeDto) {}
