import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  LedgerAccountType,
  LedgerEntryType,
  LedgerEntryCategory,
} from '@infrastructure/generated/prisma/enums';

export class CreateLedgerAccountDto {
  @ApiProperty({ enum: LedgerAccountType })
  @IsEnum(LedgerAccountType)
  type!: LedgerAccountType;
}

export class RecordLedgerEntryDto {
  @ApiProperty({ example: 'account-uuid' })
  @IsString()
  accountId!: string;

  @ApiProperty({ example: '100.50' })
  @IsDecimal()
  amount!: string;

  @ApiProperty({ enum: LedgerEntryType })
  @IsEnum(LedgerEntryType)
  type!: LedgerEntryType;

  @ApiProperty({ example: 'order-123' })
  @IsString()
  reference!: string;

  @ApiProperty({ example: 'txn-abc123' })
  @IsString()
  transactionId!: string;

  @ApiProperty({ enum: LedgerEntryCategory })
  @IsEnum(LedgerEntryCategory)
  category!: LedgerEntryCategory;
}

export class QueryLedgerEntriesDto {
  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ example: 'account-uuid' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ enum: LedgerEntryCategory })
  @IsOptional()
  @IsEnum(LedgerEntryCategory)
  category?: LedgerEntryCategory;

  @ApiPropertyOptional({ example: 'order-123' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class GetAccountBalanceDto {
  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  balance!: string;
}
