import { PartialType } from '@nestjs/swagger';
import { CreateEmergencyFundDto } from './create-emergency-fund.dto';

export class UpdateEmergencyFundDto extends PartialType(CreateEmergencyFundDto) {}
