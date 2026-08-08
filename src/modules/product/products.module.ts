// src/modules/product/product.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { EventBusModule } from '@infrastructure/event-bus';
import { ProductEventsHandler } from '@infrastructure/event-bus/handlers/product-events.handler';
import { ProductsService } from './products.service';
import {
  ProductsController,
  SellerProductsController,
} from './products.controller';
import {
  ProductPrismaRepository,
  PRODUCT_PRISMA_REPOSITORY,
} from './infrastructure/repositories/product-prisma.repository';
import {
  CreateProductUseCase,
  GetProductUseCase,
  UpdateProductUseCase,
  DeleteProductUseCase,
  CertificationUseCase,
} from './applications/use-cases';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [ProductsController, SellerProductsController],
  providers: [
    ProductsService,
    ProductEventsHandler,
    ProductPrismaRepository,
    { provide: PRODUCT_PRISMA_REPOSITORY, useClass: ProductPrismaRepository },
    CreateProductUseCase,
    GetProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    CertificationUseCase,
  ],
  exports: [
    ProductsService,
    PRODUCT_PRISMA_REPOSITORY,
    CreateProductUseCase,
    GetProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    CertificationUseCase,
  ],
})
export class ProductsModule {}
