import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CashBoxSummaryQueryDto {
  @ApiPropertyOptional({ example: "2026-07-01" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: "2026-08-02" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: "Admin only: filter by collector user id",
  })
  @IsOptional()
  @IsUUID()
  collectorId?: string;

  @ApiPropertyOptional({
    description: "Filter by assigned route id",
  })
  @IsOptional()
  @IsUUID()
  routeId?: string;
}

export class CashBoxDayDetailsQueryDto {
  @ApiPropertyOptional({
    description: "Admin only: filter by collector user id",
  })
  @IsOptional()
  @IsUUID()
  collectorId?: string;

  @ApiPropertyOptional({
    description: "Filter by assigned route id (required for entradas/salidas columns)",
  })
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiPropertyOptional({
    enum: ["entradas", "salidas", "office"],
    description:
      "Column filter: entradas=cobros, salidas=renovaciones/préstamos, office=gastos logísticos",
  })
  @IsOptional()
  @IsIn(["entradas", "salidas", "office"])
  section?: "entradas" | "salidas" | "office";
}

export class CashBoxSpreadsheetQueryDto {
  @ApiProperty({ example: "2026-07", description: "Month in YYYY-MM format" })
  @IsString()
  month!: string;

  @ApiPropertyOptional({
    description: "Admin only: filter by collector user id",
  })
  @IsOptional()
  @IsUUID()
  collectorId?: string;
}

export class CreateCashBoxExpenseDto {
  @ApiProperty({ example: "2026-08-02" })
  @IsDateString()
  expenseDate!: string;

  @ApiProperty({ example: 15000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: "Combustible ruta norte" })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiPropertyOptional({
    description: "Admin only: collector who owns this expense",
  })
  @IsOptional()
  @IsUUID()
  collectorId?: string;

  @ApiPropertyOptional({
    description: "Route this logistics expense belongs to",
  })
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiPropertyOptional({
    enum: ["route", "office"],
    default: "route",
    description: "route = gasto logístico; office = salida oficina (ambos van a la misma columna del Excel)",
  })
  @IsOptional()
  @IsIn(["route", "office"])
  category?: "route" | "office";
}

export class SetCashBoxInitialBalanceDto {
  @ApiProperty({ description: "Collector user id" })
  @IsUUID()
  collectorId!: string;

  @ApiProperty({ example: 500000, description: "Initial cash base for loans and expenses" })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: "Base semanal ruta norte" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ConfirmExpenseReceiptDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  storageKey!: string;

  @ApiProperty({ example: "image/jpeg" })
  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @ApiPropertyOptional({ example: "factura.jpg" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFileName?: string;

  @ApiPropertyOptional({ example: 245000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  fileSizeBytes?: number;
}

export class ExpenseReceiptUploadUrlDto {
  @ApiProperty({ example: "image/jpeg" })
  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @ApiPropertyOptional({ example: "factura.jpg" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;
}

export class UploadExpenseReceiptItemDto {
  @ApiProperty({ example: "image/jpeg" })
  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @ApiProperty({ description: "Base64-encoded image bytes (no data: prefix)" })
  @IsString()
  dataBase64!: string;

  @ApiPropertyOptional({ example: "factura.jpg" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFileName?: string;
}

export class UploadExpenseReceiptsDto {
  @ApiProperty({ type: [UploadExpenseReceiptItemDto] })
  @ValidateNested({ each: true })
  @Type(() => UploadExpenseReceiptItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  receipts!: UploadExpenseReceiptItemDto[];
}

export class ResetCashBoxPeriodDto {
  @ApiProperty({ description: "Collector user id" })
  @IsUUID()
  collectorId!: string;

  @ApiPropertyOptional({
    example: "2026-08-04",
    description: "Fecha desde la cual contar cobros y gastos (default: hoy)",
  })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: "Reinicio de periodo — nuevo cobrador en ruta" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
