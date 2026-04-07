import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { JwtAuthGuard } from '../auth/guards';
import { CartsService } from './carts.service';
import { AddCartItemDto, UpdateCartItemDto } from './dtos';

@ApiTags('Cart')
@Controller('cart')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current user cart' })
  getCart(@GetUser() user: AuthUser) {
    return this.cartsService.getCart(user.id);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(@GetUser() user: AuthUser, @Body() dto: AddCartItemDto) {
    console.log(dto);
    return this.cartsService.addItem(user.id, dto);
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @GetUser() user: AuthUser,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateItem(user.id, itemId, dto);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(@GetUser() user: AuthUser, @Param('id') itemId: string) {
    return this.cartsService.removeItem(user.id, itemId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Clear cart' })
  clearCart(@GetUser() user: AuthUser) {
    return this.cartsService.clearCart(user.id);
  }
}
