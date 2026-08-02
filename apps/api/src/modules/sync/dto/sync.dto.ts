import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { CreatePaymentDto } from "../../payments/dto/payments.dto";

export class SyncEventItemDto {
  @ApiProperty({ example: "evt-uuid-1" })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  clientEventId!: string;

  @ApiProperty({ example: "PAYMENT_CREATE" })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  eventType!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => CreatePaymentDto)
  payload!: CreatePaymentDto;

  @ApiProperty({ example: "2026-07-26T14:30:00.000Z" })
  @IsDateString()
  capturedAt!: string;
}

export class SyncEventsDto {
  @ApiProperty({ example: "device-uuid" })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  deviceId!: string;

  @ApiProperty({ type: [SyncEventItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SyncEventItemDto)
  events!: SyncEventItemDto[];
}
