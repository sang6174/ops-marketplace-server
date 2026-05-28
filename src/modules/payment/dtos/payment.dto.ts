// src/module/payment/dto/payment.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsDecimal,
  IsIn,
} from 'class-validator';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentProvider,
  RefundStatus,
} from '@infrastructure/generated/prisma/enums';
import { SearchPaginationDto } from '@common/dtos/pagination.dto';

export class CreatePaymentDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    description: 'Order IDs to create payment for',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  orderIds!: string[];

  @ApiProperty({
    enum: PaymentMethod,
    example: 'COD',
    description: 'Payment method',
  })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({
    enum: PaymentProvider,
    description: 'Payment provider (required for ONLINE method)',
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({
    enum: PaymentStatus,
    example: 'SUCCESS',
    description: 'New payment status',
  })
  @IsEnum(PaymentStatus)
  status!: PaymentStatus;

  @ApiPropertyOptional({ description: 'Payment provider reference ID' })
  @IsOptional()
  @IsString()
  providerRef?: string;
}

export class PaymentItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  paymentId!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  amount!: string;
}

export class PaymentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  status!: PaymentStatus;

  @ApiProperty()
  method!: PaymentMethod;

  @ApiPropertyOptional()
  provider?: PaymentProvider;

  @ApiPropertyOptional()
  providerRef?: string;

  @ApiProperty({ type: [PaymentItemDto] })
  items!: PaymentItemDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class QueryPaymentsDto extends SearchPaginationDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}

export class InitiatePaymentDto extends CreatePaymentDto {}

export class PaymentWebhookDto {
  @ApiPropertyOptional({ description: 'Payment ID in this system' })
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiPropertyOptional({ description: 'Provider reference ID' })
  @IsOptional()
  @IsString()
  providerRef?: string;

  @ApiPropertyOptional({ enum: ['SUCCESS', 'FAILED', 'PENDING'] })
  @IsOptional()
  @IsIn(['SUCCESS', 'FAILED', 'PENDING'])
  status?: PaymentStatus;
}

export class ConfirmCodPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;
}

export class RequestRefundDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiPropertyOptional({ example: '100000' })
  @IsOptional()
  @IsDecimal()
  amount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RejectRefundDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryRefundsDto extends SearchPaginationDto {
  @ApiPropertyOptional({ enum: RefundStatus })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;
}
