// src/module/order/dto/order.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from '@infrastructure/generated/prisma/enums';
import { SearchPaginationDto } from '@common/dtos/pagination.dto';

export class CreateOrderDto {
  @ApiProperty({
    example: '4a1f2b0d-8f4b-4a1a-9c7a-1234567890ab',
    description: 'Address ID for delivery',
  })
  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: 'COD',
    description: 'Payment method',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: 'CONFIRMED',
    description: 'New order status',
  })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

export class UpdateOrderPaymentStatusDto {
  @ApiProperty({
    enum: PaymentStatus,
    example: 'SUCCESS',
    description: 'New payment status',
  })
  @IsEnum(PaymentStatus)
  paymentStatus!: PaymentStatus;
}

export class OrderItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  variantId!: string;

  @ApiProperty()
  price!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  variantName!: string;

  @ApiProperty()
  sku!: string;

  @ApiPropertyOptional()
  productImage?: string;

  @ApiPropertyOptional()
  attributes?: Record<string, unknown>;
}

export class OrderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  status!: OrderStatus;

  @ApiProperty()
  totalPrice!: string;

  @ApiPropertyOptional()
  addressId?: string;

  @ApiProperty()
  paymentStatus!: PaymentStatus;

  @ApiPropertyOptional()
  paymentMethod?: PaymentMethod;

  @ApiProperty({ type: [OrderItemDto] })
  items!: OrderItemDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  confirmedAt?: Date;

  @ApiPropertyOptional()
  shippedAt?: Date;

  @ApiPropertyOptional()
  deliveredAt?: Date;
}

export class QueryOrdersDto extends SearchPaginationDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}
