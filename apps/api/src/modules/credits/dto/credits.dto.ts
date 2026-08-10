import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CreditStatus } from "../../../common/constants";

export class CreateCreditDto {
  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  principalAmount!: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(3650)
  totalInstallments!: number;

  @ApiProperty({ example: 150 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  installmentAmount!: number;

  @ApiProperty({ example: "2026-08-01" })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  interestRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Required when client is on multiple routes" })
  @IsOptional()
  @IsUUID()
  routeId?: string;
}

export class RegenerateInstallmentsDto {
  @ApiProperty({ example: "2026-08-01" })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  totalInstallments!: number;

  @ApiProperty({ example: 150 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  installmentAmount!: number;
}

export class ListCreditsQueryDto {
  @ApiPropertyOptional({ enum: CreditStatus })
  @IsOptional()
  @IsEnum(CreditStatus)
  status?: CreditStatus;
}
