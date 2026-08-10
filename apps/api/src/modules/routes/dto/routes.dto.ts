import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ShiftType } from "../../../common/constants";
import { ROUTE_COUNTRY_CODES } from "../domain/route-locations";

export class CreateRouteDto {
  @ApiProperty({ example: "Ruta Centro" })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: "CO", description: "ISO 3166-1 alpha-2 country code" })
  @IsString()
  @Length(2, 2)
  @IsIn(ROUTE_COUNTRY_CODES)
  country!: string;

  @ApiProperty({ example: "Bogotá" })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional({ enum: ShiftType, default: ShiftType.MORNING })
  @IsOptional()
  @IsEnum(ShiftType)
  shift?: ShiftType;

  @ApiPropertyOptional({ description: "0=Sun … 6=Sat, null=all days" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Active collector to assign from today" })
  @IsOptional()
  @IsUUID()
  collectorId?: string;
}

export class UpdateRouteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: ShiftType })
  @IsOptional()
  @IsEnum(ShiftType)
  shift?: ShiftType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: "CO" })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @IsIn(ROUTE_COUNTRY_CODES)
  country?: string;

  @ApiPropertyOptional({ example: "Bogotá" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}

export class ListRoutesQueryDto {
  @ApiPropertyOptional({ enum: ShiftType })
  @IsOptional()
  @IsEnum(ShiftType)
  shift?: ShiftType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class MyRoutesQueryDto {
  @ApiPropertyOptional({ example: "2026-07-26" })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: ShiftType })
  @IsOptional()
  @IsEnum(ShiftType)
  shift?: ShiftType;
}

export class RouteClientsQueryDto {
  @ApiPropertyOptional({ example: "2026-07-26" })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class ReplaceRouteClientsDto {
  @ApiProperty({
    type: [String],
    description: "Ordered list of client UUIDs (sequence = array order)",
  })
  @IsArray()
  @IsUUID("4", { each: true })
  clientIds!: string[];
}

export class AssignCollectorDto {
  @ApiProperty()
  @IsUUID()
  collectorId!: string;

  @ApiProperty({ example: "2026-08-01" })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
