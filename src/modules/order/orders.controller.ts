// src/module/order/order.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@infrastructure/generated/prisma/enums';
import { GetUser, Permissions, Roles } from '@common/decorators';
import { Permission } from '@common/constants/permissions';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { JwtAuthGuard } from '../auth/guards';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdateOrderPaymentStatusDto,
  QueryOrdersDto,
} from './dtos/order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create orders from cart (one order per shop)' })
  createOrdersFromCart(@GetUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrdersFromCart(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List user orders' })
  listOrders(@GetUser() user: AuthUser, @Query() dto: QueryOrdersDto) {
    return this.ordersService.listOrders(user.id, dto);
  }

  @Get('shops/me')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @Permissions(Permission.ORDER_READ)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[Seller] List shop orders' })
  listShopOrders(@GetUser() user: AuthUser, @Query() dto: QueryOrdersDto) {
    return this.ordersService.listShopOrders(user.id, dto);
  }

  @Get('shops/me/:id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @Permissions(Permission.ORDER_READ)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[Seller] Get shop order details' })
  getShopOrder(@GetUser() user: AuthUser, @Param('id') orderId: string) {
    return this.ordersService.getOrderAsShop(user.id, orderId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @Permissions(Permission.ORDER_UPDATE)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[Seller] Update order status' })
  updateOrderStatus(
    @GetUser() user: AuthUser,
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(user.id, orderId, dto);
  }

  @Patch(':id/payment-status')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @Permissions(Permission.PAYMENT_UPDATE)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[Seller] Update payment status' })
  updatePaymentStatus(
    @GetUser() user: AuthUser,
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderPaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatus(user.id, orderId, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get order details' })
  getOrder(@GetUser() user: AuthUser, @Param('id') orderId: string) {
    return this.ordersService.getOrder(user.id, orderId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cancel order (only PENDING status)' })
  cancelOrder(@GetUser() user: AuthUser, @Param('id') orderId: string) {
    return this.ordersService.cancelOrder(user.id, orderId);
  }
}
