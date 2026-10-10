import { IsEmail, IsString, IsOptional, IsArray, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { trimLowerCase } from '../../common/utils/normalize-email';

export class CreateUserDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @Transform(trimLowerCase) @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() roleIds?: string[];
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @Transform(trimLowerCase) @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsArray() roleIds?: string[];
  @IsOptional() isActive?: boolean;
  @IsOptional() @IsString() plan?: string;
}