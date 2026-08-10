import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDeviceDto {
  @ApiProperty({ example: "device-uuid-123" })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  deviceId!: string;

  @ApiProperty({ example: "fcm-token-string" })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  fcmToken!: string;

  @ApiPropertyOptional({ enum: ["ios", "android"] })
  @IsOptional()
  @IsIn(["ios", "android"])
  platform?: "ios" | "android";
}

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
