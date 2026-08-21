import { PartialType } from '@nestjs/swagger';
import { CreateHouseholdExpenseDto } from './create-household-expense.dto';

export class UpdateHouseholdExpenseDto extends PartialType(CreateHouseholdExpenseDto) {}
