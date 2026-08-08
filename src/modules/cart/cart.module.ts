import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import {
  CartPrismaRepository,
  CART_PRISMA_REPOSITORY,
} from './infrastructure/repositories/cart-prisma.repository';
import {
  AddItemToCartUseCase,
  GetCartUseCase,
  UpdateCartUseCase,
  CheckoutUseCase,
} from './applications/use-cases';

@Module({
  imports: [PrismaModule],
  controllers: [CartsController],
  providers: [
    CartsService,
    CartPrismaRepository,
    { provide: CART_PRISMA_REPOSITORY, useClass: CartPrismaRepository },
    AddItemToCartUseCase,
    GetCartUseCase,
    UpdateCartUseCase,
    CheckoutUseCase,
  ],
  exports: [
    CartsService,
    CART_PRISMA_REPOSITORY,
    AddItemToCartUseCase,
    GetCartUseCase,
    UpdateCartUseCase,
    CheckoutUseCase,
  ],
})
export class CartsModule {}
