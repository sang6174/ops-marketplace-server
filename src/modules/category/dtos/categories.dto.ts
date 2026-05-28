import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Điện Tử' })
  @IsString()
  @IsNotEmpty({ message: 'Name of Category is not empty' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'dien-tu' })
  @IsString()
  @IsNotEmpty({ message: 'slug is not empty' })
  @MaxLength(100)
  slug!: string;

  @ApiProperty({ example: 'uuidv4' })
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
