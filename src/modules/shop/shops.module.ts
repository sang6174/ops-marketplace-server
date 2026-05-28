// src/modules/shop/shops.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { ProductsModule } from '@/modules/product/products.module';
import { SellerShopController, ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [ShopsController, SellerShopController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
