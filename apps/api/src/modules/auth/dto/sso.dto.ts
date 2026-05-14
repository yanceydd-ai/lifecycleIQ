import { IsEmail, IsString } from 'class-validator';

export class SsoDto {
  @IsEmail()
  email: string;

  @IsString()
  internalSecret: string;
}
