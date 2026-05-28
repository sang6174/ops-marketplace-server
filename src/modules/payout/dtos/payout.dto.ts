// src/module/payout/dto/payout.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDecimal,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PayoutStatusEnum {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export class BankAccountDto {
  @IsString()
  @IsNotEmpty()
  bankName!: string;

  @IsString()
  @IsNotEmpty()
  accountNo!: string;

  @IsString()
  @IsNotEmpty()
  accountName!: string;

  @IsOptional()
  isDefault?: boolean;
}

export class CreatePayoutDto {
  @IsDecimal()
  @IsNotEmpty()
  amount!: string;

  @IsString()
  @IsOptional()
  bankAccountId?: string;
}

export class UpdatePayoutStatusDto {
  @IsEnum(PayoutStatusEnum)
  @IsNotEmpty()
  status!: PayoutStatusEnum;

  @IsString()
  @IsOptional()
  reference?: string;
}

export class QueryPayoutsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(PayoutStatusEnum)
  status?: PayoutStatusEnum;
}

export class PayoutDto {
  id!: string;
  userId!: string;
  amount!: string;
  status!: PayoutStatusEnum;
  reference?: string;
  createdAt!: Date;
  paidAt?: Date;
}

export class SellerBalanceDto {
  available!: string;
  pending!: string;
  total!: string;
}
