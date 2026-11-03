import { IsBoolean } from 'class-validator';

export class SetAutoRatesDto {
  @IsBoolean() enabled: boolean;
}
