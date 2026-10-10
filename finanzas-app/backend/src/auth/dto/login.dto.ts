import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { trimLowerCase } from '../../common/utils/normalize-email';

export class LoginDto {
  @ApiProperty({ example: 'admin@finanzas.com' })
  @Transform(trimLowerCase)
  @IsEmail() email: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString() @MinLength(6) password: string;
}