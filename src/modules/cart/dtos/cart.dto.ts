import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddCartItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class UpdateCartItemDto {
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CheckoutCartDto {
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  addressId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApplyCouponDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
