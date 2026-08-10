import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/;

export class RegisterDto {
  @ApiProperty({ example: "collector@example.com" })
  @IsEmail({}, { message: "El correo electrónico no es válido" })
  email!: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @MinLength(10, { message: "La contraseña debe tener al menos 10 caracteres" })
  @Matches(PASSWORD_REGEX, {
    message:
      "La contraseña debe incluir mayúsculas, minúsculas, números y un carácter especial",
  })
  password!: string;

  @ApiProperty({ example: "Juan" })
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: "Pérez" })
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ example: "+573001234567" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @Matches(PASSWORD_REGEX, {
    message:
      "La contraseña debe incluir mayúsculas, minúsculas, números y un carácter especial",
  })
  newPassword!: string;
}

export class LogoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
