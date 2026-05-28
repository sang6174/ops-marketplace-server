// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';

import {
  appConfig,
  jwtConfig,
  databaseConfig,
  mailConfig,
  paymentConfig,
} from './configs/index';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';

import { RolesAndPermissionsGuard } from '@modules/auth/guards';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from './modules/user/users.module';
import { AdminModule } from './modules/admin/admin.module';
import { ShopsModule } from './modules/shop/shops.module';
import { ProductsModule } from './modules/product/products.module';
import { CategoriesModule } from './modules/category/categories.module';
import { CartsModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/order/orders.module';
import { PaymentsModule } from './modules/payment/payments.module';
import { PayoutsModule } from './modules/payout/payouts.module';
import { LedgerModule } from './modules/ledger/ledger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, jwtConfig, databaseConfig, mailConfig, paymentConfig],
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    ShopsModule,
    ProductsModule,
    CategoriesModule,
    CartsModule,
    OrdersModule,
    PaymentsModule,
    PayoutsModule,
    LedgerModule,
  ],

  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: RolesAndPermissionsGuard,
    },
  ],
})
export class AppModule {}
