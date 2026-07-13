import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { Role } from '@lifecycleiq/shared';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/, {
    message: 'Password must contain uppercase, lowercase, a number, and a special character',
  })
  password: string;

  @IsString()
  @MaxLength(100)
  displayName: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
