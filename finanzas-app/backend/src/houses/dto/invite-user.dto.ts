import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { trimLowerCase } from '../../common/utils/normalize-email';

export const MEMBER_ROLES = ['user', 'house_admin'] as const;

export class InviteUserDto {
  @Transform(trimLowerCase)
  @IsEmail()
  email: string;

  @IsOptional()
  @IsIn(MEMBER_ROLES)
  role?: string;
}

export class CreateMemberDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @Transform(trimLowerCase)
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @IsOptional()
  @IsIn(MEMBER_ROLES)
  role?: string;
}
