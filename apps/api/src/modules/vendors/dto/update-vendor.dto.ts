import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  accountRepName?: string;

  @IsOptional()
  @IsEmail()
  accountRepEmail?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
