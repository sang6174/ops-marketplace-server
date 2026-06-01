import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum GhnRequiredNote {
  CHOTHUHANG = 'CHOTHUHANG',
  CHOXEMHANGKHONGTHU = 'CHOXEMHANGKHONGTHU',
  KHONGCHOXEMHANG = 'KHONGCHOXEMHANG',
}

export class CreateShippingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiPropertyOptional({
    description: 'Recipient name. Defaults to order user name.',
  })
  @IsOptional()
  @IsString()
  toName?: string;

  @ApiPropertyOptional({
    description: 'Recipient phone number required by GHN.',
  })
  @IsOptional()
  @IsString()
  toPhone?: string;

  @ApiPropertyOptional({
    description: 'Recipient address. Defaults to order address line.',
  })
  @IsOptional()
  @IsString()
  toAddress?: string;

  @ApiPropertyOptional({ description: 'GHN ward code of recipient.' })
  @IsOptional()
  @IsString()
  toWardCode?: string;

  @ApiPropertyOptional({ description: 'GHN district id of recipient.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  toDistrictId?: number;

  @ApiPropertyOptional({
    default: 200,
    description: 'Package weight in grams.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weight?: number;

  @ApiPropertyOptional({ default: 10, description: 'Package length in cm.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  length?: number;

  @ApiPropertyOptional({ default: 10, description: 'Package width in cm.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ default: 10, description: 'Package height in cm.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ default: 2, description: 'GHN payment type id.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentTypeId?: number;

  @ApiPropertyOptional({ default: 2, description: 'GHN service type id.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceTypeId?: number;

  @ApiPropertyOptional({
    description:
      'GHN service id. If present, GHN does not require service_type_id.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceId?: number;

  @ApiPropertyOptional({
    enum: GhnRequiredNote,
    default: GhnRequiredNote.KHONGCHOXEMHANG,
  })
  @IsOptional()
  @IsEnum(GhnRequiredNote)
  requiredNote?: GhnRequiredNote;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  codAmount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  insuranceValue?: number;

  @ApiPropertyOptional({
    description: 'Advanced override merged into the GHN create order payload',
  })
  @IsOptional()
  providerPayload?: Record<string, unknown>;
}

export class PrintShippingLabelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  trackingCode!: string;
}

export class ShippingFeeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'GHN service id.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceId?: number;

  @ApiPropertyOptional({ default: 2, description: 'GHN service type id.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceTypeId?: number;

  @ApiPropertyOptional({ description: 'GHN district id of recipient.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  toDistrictId?: number;

  @ApiPropertyOptional({ description: 'GHN ward code of recipient.' })
  @IsOptional()
  @IsString()
  toWardCode?: string;

  @ApiPropertyOptional({
    default: 200,
    description: 'Package weight in grams.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weight?: number;

  @ApiPropertyOptional({ default: 10, description: 'Package length in cm.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  length?: number;

  @ApiPropertyOptional({ default: 10, description: 'Package width in cm.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ default: 10, description: 'Package height in cm.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  insuranceValue?: number;

  @ApiPropertyOptional({
    description: 'Advanced JSON string merged into the GHN fee payload',
  })
  @IsOptional()
  @IsString()
  payload?: string;
}
