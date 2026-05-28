import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { GetUser, Public, Roles } from '@common/decorators';
import { UserRole } from '@infrastructure/generated/prisma/enums';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { JwtAuthGuard } from '@modules/auth/guards';
import {
  CreateShippingDto,
  PrintShippingLabelDto,
  ShippingFeeQueryDto,
  ShippingProvider,
} from './dtos/shipping.dto';
import { ShippingService } from './shipping.service';

@ApiTags('Seller Shipping')
@ApiBearerAuth('JWT')
@Controller('seller/shipping')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SELLER)
export class SellerShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('orders/:orderId')
  @ApiOperation({ summary: '[SELLER] Get order shipping information' })
  getOrderShipping(
    @GetUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    return this.shippingService.getOrderShipping(user.id, orderId);
  }

  @Post('create')
  @ApiOperation({ summary: '[SELLER] Create shipping order' })
  createShipping(@GetUser() user: AuthUser, @Body() dto: CreateShippingDto) {
    return this.shippingService.createShipping(user.id, dto);
  }

  @Post('print-label')
  @ApiOperation({ summary: '[SELLER] Print shipping label' })
  printLabel(@GetUser() user: AuthUser, @Body() dto: PrintShippingLabelDto) {
    return this.shippingService.printLabel(user.id, dto);
  }

  @Get('track/:trackingCode')
  @ApiOperation({ summary: '[SELLER] Track shipping order' })
  trackShipping(
    @GetUser() user: AuthUser,
    @Param('trackingCode') trackingCode: string,
  ) {
    return this.shippingService.trackShipping(user.id, trackingCode);
  }

  @Get('fees')
  @ApiOperation({ summary: '[SELLER] Calculate shipping fee' })
  calculateFee(@GetUser() user: AuthUser, @Query() dto: ShippingFeeQueryDto) {
    return this.shippingService.calculateFee(user.id, dto);
  }
}

@ApiTags('Shipping Webhooks')
@Controller('webhooks/shipping')
export class ShippingWebhooksController {
  constructor(private readonly shippingService: ShippingService) {}

  @Public()
  @Post('ghn')
  @ApiOperation({ summary: 'GHN shipping webhook' })
  handleGhnWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.shippingService.handleWebhook({
      provider: ShippingProvider.GHN,
      payload,
      query,
      headers: request.headers,
      rawBody: request.rawBody,
    });
  }

  @Public()
  @Post('ghtk')
  @ApiOperation({ summary: 'GHTK shipping webhook' })
  handleGhtkWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: Record<string, unknown>,
    @Query() query: Record<string, unknown>,
  ) {
    return this.shippingService.handleWebhook({
      provider: ShippingProvider.GHTK,
      payload,
      query,
      headers: request.headers,
      rawBody: request.rawBody,
    });
  }
}
