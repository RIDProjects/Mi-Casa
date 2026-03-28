import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ example: 'Mi Casa' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  houseName: string;

  @ApiProperty({ example: 'casa123' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  housePassword: string;
}
