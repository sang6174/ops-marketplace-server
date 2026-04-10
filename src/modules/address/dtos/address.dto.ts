// src/module/address/dto/address.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    example: '12 Bùi Thế Mỹ, Phường Bảy Hiền',
    description: 'Street address line',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine!: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh', description: 'City name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiProperty({
    example: 'Việt Nam',
    description: 'Country name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country!: string;

  @ApiPropertyOptional({ example: true, description: 'Set as default address' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiProperty({
    example: '2 Bùi Thế Mỹ, Phường Bảy Hiền',
    description: 'Street address line',
  })
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine?: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh', description: 'City name' })
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({
    example: 'Việt Nam',
    description: 'Country name',
  })
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class AddressDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional()
  addressLine?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
