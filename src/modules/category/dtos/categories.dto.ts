import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Điện Thoại' })
  @IsString()
  @IsNotEmpty({ message: 'Tên category không được để trống' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'dien-thoai' })
  @IsString()
  @IsNotEmpty({ message: 'slug không được để trống' })
  @MaxLength(100)
  slug!: string;

  @ApiProperty({ example: 'uuidv4' })
  parentId?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
