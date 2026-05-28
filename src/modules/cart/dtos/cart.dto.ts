import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@infrastructure/generated/prisma/enums';

export class AddCartItemDto {
  @ApiProperty({ example: '4a1f2b0d-8f4b-4a1a-9c7a-1234567890ab' })
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive({ message: 'Quantity must be greater than zero' })
  quantity!: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0, { message: 'Quantity must be greater than or equal to zero' })
  quantity!: number;
}

export class ApplyCouponDto {
  @ApiProperty({ example: 'SUMMER10' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class CheckoutCartDto {
  @ApiProperty({ example: '4a1f2b0d-8f4b-4a1a-9c7a-1234567890ab' })
  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.COD })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
