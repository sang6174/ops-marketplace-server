// src/modules/product/product.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { ProductsService } from './products.service';
import {
  ProductsController,
  SellerProductsController,
} from './products.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, SellerProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
