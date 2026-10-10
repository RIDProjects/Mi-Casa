import { IsEmail, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { trimLowerCase } from '../../common/utils/normalize-email';

export class ForgotPasswordDto {
  @Transform(trimLowerCase)
  @IsEmail() email: string;
}

export class ResetPasswordDto {
  @IsString() token: string;
  @IsString() @MinLength(6) password: string;
}
