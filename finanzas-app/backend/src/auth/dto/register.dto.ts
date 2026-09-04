import { IsEmail, IsString, MinLength, MaxLength, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'juan@email.com' })
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
}
