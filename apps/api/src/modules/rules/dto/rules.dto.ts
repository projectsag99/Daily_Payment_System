import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  NotificationChannel,
  RuleType,
} from "../../../common/constants";

export class CreateRuleDto {
  @ApiProperty({ example: "Alerta 3+ cuotas vencidas" })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: RuleType })
  @IsEnum(RuleType)
  ruleType!: RuleType;

  @ApiProperty({
    example: { thresholdCount: 3, scope: "assigned_collector" },
  })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional({ enum: NotificationChannel, default: "push" })
  @IsOptional()
  @IsEnum(NotificationChannel)
  notifyChannel?: NotificationChannel;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  cooldownHours?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  notifyChannel?: NotificationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  cooldownHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class EvaluateRuleDto {
  @ApiPropertyOptional({ description: "Evaluate a single client only" })
  @IsOptional()
  @IsString()
  clientId?: string;
}
