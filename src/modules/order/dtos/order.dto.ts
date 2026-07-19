import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationDto } from '@common/dtos/pagination.dto';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@infrastructure/generated/prisma/enums';

export class CreateOrderDto {
  @ApiProperty({ description: 'Shipping address ID' })
  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.BANK_TRANSFER })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod = PaymentMethod.BANK_TRANSFER;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

export class UpdateOrderPaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  paymentStatus!: PaymentStatus;
}

export class QueryOrdersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}
