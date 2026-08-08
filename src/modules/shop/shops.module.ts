// src/modules/shop/shops.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { ProductsModule } from '@/modules/product/products.module';
import { SellerShopController, ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';
import {
  ShopPrismaRepository,
  SHOP_PRISMA_REPOSITORY,
} from './infrastructure/repositories/shop-prisma.repository';
import {
  CreateShopUseCase,
  CheckShopNameUseCase,
  GetShopUseCase,
  UpdateShopUseCase,
  DeleteShopUseCase,
} from './applications/use-cases';

@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [ShopsController, SellerShopController],
  providers: [
    ShopsService,
    ShopPrismaRepository,
    { provide: SHOP_PRISMA_REPOSITORY, useClass: ShopPrismaRepository },
    CreateShopUseCase,
    CheckShopNameUseCase,
    GetShopUseCase,
    UpdateShopUseCase,
    DeleteShopUseCase,
  ],
  exports: [
    ShopsService,
    SHOP_PRISMA_REPOSITORY,
    CreateShopUseCase,
    CheckShopNameUseCase,
    GetShopUseCase,
    UpdateShopUseCase,
    DeleteShopUseCase,
  ],
})
export class ShopsModule {}
