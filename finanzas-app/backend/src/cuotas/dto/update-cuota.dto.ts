import { PartialType } from '@nestjs/swagger';
import { CreateCuotaDto } from './create-cuota.dto';

export class UpdateCuotaDto extends PartialType(CreateCuotaDto) {}
