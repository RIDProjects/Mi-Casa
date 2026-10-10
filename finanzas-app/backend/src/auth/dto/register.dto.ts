import { IsEmail, IsString, MinLength, MaxLength, IsOptional, ValidateIf, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { trimLowerCase } from '../../common/utils/normalize-email';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CURRENCY_META } from '../../house-currencies/house-currencies.service';

export class RegisterDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'juan@email.com' })
  @Transform(trimLowerCase)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Juan123!' })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  // houseName/housePassword solo son requeridos cuando NO viene un invitationToken
  // (la invitación ya trae la casa y el rol asociados).
  @ApiPropertyOptional({ example: 'Mi Casa' })
  @ValidateIf(o => !o.invitationToken)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  houseName?: string;

  @ApiPropertyOptional({ example: 'casa123' })
  @ValidateIf(o => !o.invitationToken)
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  housePassword?: string;

  @ApiPropertyOptional({ example: 'a1b2c3...' })
  @IsOptional()
  @IsString()
  invitationToken?: string;

  // Only used when a new house is created. Must be a currency the app knows
  // (name, symbol and locale come from CURRENCY_META); an unknown code used to
  // be accepted and silently get CUP's symbol and locale.
  @ApiPropertyOptional({ example: 'CUP' })
  @IsOptional()
  @IsIn(Object.keys(CURRENCY_META), { message: 'localCurrencyCode must be a supported currency code' })
  localCurrencyCode?: string;
}
