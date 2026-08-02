import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class CreateReceiptLinkDto {
  @ApiPropertyOptional({ example: 30, description: "Days until link expires" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  expiresInDays?: number;
}
