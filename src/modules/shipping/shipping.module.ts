import { Module } from '@nestjs/common';
import {
  SellerShippingController,
  ShippingWebhooksController,
} from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  controllers: [SellerShippingController, ShippingWebhooksController],
  providers: [ShippingService],
})
export class ShippingModule {}
