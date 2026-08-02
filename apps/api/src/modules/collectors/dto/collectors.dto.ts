import { IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CollectorStatus } from "../../../common/constants";
import { IsEnum } from "class-validator";

export class ListCollectorsQueryDto {
  @ApiPropertyOptional({ enum: CollectorStatus })
  @IsOptional()
  @IsEnum(CollectorStatus)
  status?: CollectorStatus;
}

export class ApproveCollectorDto {
  @ApiPropertyOptional({ example: "COL-001" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectCollectorDto {
  @ApiProperty({ example: "Documentación incompleta" })
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class SuspendCollectorDto {
  @ApiProperty({ example: "Incumplimiento de políticas" })
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class DeactivateCollectorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
