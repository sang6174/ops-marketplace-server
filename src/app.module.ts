// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { appConfig, jwtConfig, databaseConfig } from './configs/index';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';

import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from './modules/user/users.module';
import { ShopsModule } from './modules/shop/shops.module';
import { ProductsModule } from './modules/product/products.module';
import { CategoriesModule } from './modules/category/categories.module';
import { CartsModule } from './modules/cart/cart.module';
import { AddressesModule } from './modules/address/addresses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, jwtConfig, databaseConfig],
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    ShopsModule,
    ProductsModule,
    CategoriesModule,
    CartsModule,
    AddressesModule,
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
  ],
})
export class AppModule {}
