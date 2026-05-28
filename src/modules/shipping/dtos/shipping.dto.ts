import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ShippingProvider {
  GHN = 'GHN',
  GHTK = 'GHTK',
}

export class CreateShippingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ enum: ShippingProvider })
  @IsEnum(ShippingProvider)
  provider!: ShippingProvider;

  @ApiPropertyOptional({
    description: 'JSON object sent directly to the selected shipping provider',
  })
  @IsOptional()
  providerPayload?: Record<string, unknown>;
}

export class PrintShippingLabelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  trackingCode!: string;

  @ApiProperty({ enum: ShippingProvider })
  @IsEnum(ShippingProvider)
  provider!: ShippingProvider;
}

export class ShippingFeeQueryDto {
  @ApiProperty({ enum: ShippingProvider })
  @IsEnum(ShippingProvider)
  provider!: ShippingProvider;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'JSON string sent directly to the selected shipping provider',
  })
  @IsOptional()
  @IsString()
  payload?: string;
}
