import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import {
  SellerShippingController,
  ShippingWebhooksController,
} from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [PrismaModule],
  controllers: [SellerShippingController, ShippingWebhooksController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
