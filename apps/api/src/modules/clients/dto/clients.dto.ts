import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ClientStatus, DocumentType, ShiftType } from "../../../common/constants";
import { ROUTE_COUNTRY_CODES } from "../../routes/domain/route-locations";

export class LocationDto {
  @ApiProperty({ example: 4.6097 })
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: -74.0817 })
  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

export class CreateClientDto {
  @ApiProperty({ example: "María" })
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: "González" })
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ example: "1234567890" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationalId?: string;

  @ApiPropertyOptional({ example: "+573001234567" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: "Calle 123 #45-67" })
  @IsOptional()
  @IsString()
  addressLine?: string;

  @ApiProperty({ example: "CO" })
  @IsIn(ROUTE_COUNTRY_CODES)
  country!: string;

  @ApiProperty({ example: "DC" })
  @IsString()
  @MaxLength(10)
  department!: string;

  @ApiProperty({ example: "Bogotá" })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateClientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine?: string;

  @ApiPropertyOptional({ example: "CO" })
  @IsOptional()
  @IsIn(ROUTE_COUNTRY_CODES)
  country?: string;

  @ApiPropertyOptional({ example: "DC" })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  department?: string;

  @ApiPropertyOptional({ example: "Bogotá" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional({ enum: ClientStatus })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateClientLocationDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  accuracyM?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceId?: string;
}

export class ListClientsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ClientStatus })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiPropertyOptional({ enum: ShiftType })
  @IsOptional()
  @IsEnum(ShiftType)
  shift?: ShiftType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({ description: "lat,lng", example: "4.6097,-74.0817" })
  @IsOptional()
  @IsString()
  near?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  radius_m?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ default: "-createdAt" })
  @IsOptional()
  @IsString()
  sort?: string;
}

export class UploadUrlRequestDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @ApiProperty({ example: "image/jpeg" })
  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @ApiProperty({ example: "cedula.jpg" })
  @IsString()
  @MaxLength(255)
  fileName!: string;
}

export class ConfirmDocumentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  storageKey!: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @ApiProperty({ example: "image/jpeg" })
  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @ApiProperty({ example: 102400 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  fileSizeBytes!: number;
}
