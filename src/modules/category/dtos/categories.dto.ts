import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Đồ Công Nghệ' })
  @IsString()
  @IsNotEmpty({ message: 'Name of Category is not empty' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'do-cong-nghe' })
  @IsString()
  @IsNotEmpty({ message: 'slug is not empty' })
  @MaxLength(100)
  slug!: string;

  @ApiProperty({ example: 'uuidv4' })
  parentId?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
