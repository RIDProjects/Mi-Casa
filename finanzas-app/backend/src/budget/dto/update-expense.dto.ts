import { PartialType } from '@nestjs/swagger';
import { AddExpenseDto } from './add-expense.dto';

export class UpdateExpenseDto extends PartialType(AddExpenseDto) {}
