import { IsEmail, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  accountRepName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  accountRepEmail?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  supportEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
