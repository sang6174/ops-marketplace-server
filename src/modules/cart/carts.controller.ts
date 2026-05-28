import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { JwtAuthGuard } from '../auth/guards';
import { CartsService } from './carts.service';
import {
  AddCartItemDto,
  ApplyCouponDto,
  CheckoutCartDto,
  UpdateCartItemDto,
} from './dtos';

@ApiTags('Cart')
@ApiBearerAuth('JWT')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  getCart(@GetUser() user: AuthUser) {
    return this.cartsService.getCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(@GetUser() user: AuthUser, @Body() dto: AddCartItemDto) {
    return this.cartsService.addItem(user.id, dto);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @GetUser() user: AuthUser,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateItem(user.id, itemId, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(@GetUser() user: AuthUser, @Param('id') itemId: string) {
    return this.cartsService.removeItem(user.id, itemId);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear cart' })
  clearCart(@GetUser() user: AuthUser) {
    return this.cartsService.clearCart(user.id);
  }

  @Post('apply-coupon')
  @ApiOperation({ summary: 'Apply coupon to cart' })
  applyCoupon(@GetUser() user: AuthUser, @Body() dto: ApplyCouponDto) {
    return this.cartsService.applyCoupon(user.id, dto);
  }

  @Delete('remove-coupon')
  @ApiOperation({ summary: 'Remove coupon from cart' })
  removeCoupon(@GetUser() user: AuthUser) {
    return this.cartsService.removeCoupon(user.id);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Checkout current cart' })
  checkout(@GetUser() user: AuthUser, @Body() dto: CheckoutCartDto) {
    return this.cartsService.checkout(user.id, dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get cart summary' })
  getSummary(@GetUser() user: AuthUser) {
    return this.cartsService.getSummary(user.id);
  }
}
