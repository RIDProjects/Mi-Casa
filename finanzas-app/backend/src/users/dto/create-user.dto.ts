import { IsEmail, IsString, IsOptional, IsArray, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() whatsappNumber?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() roleIds?: string[];
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsString() whatsappNumber?: string;
  @IsOptional() @IsArray() roleIds?: string[];
  @IsOptional() isActive?: boolean;
}