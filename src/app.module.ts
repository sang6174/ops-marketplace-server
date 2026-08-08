// src/app.module.ts
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
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
import { EventBusModule } from '@infrastructure/event-bus';
import { CommonModule } from '@common/common.module';
import { BaseExceptionFilter } from '@common/filters';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { IdempotencyInterceptor } from '@common/interceptors/idempotency.interceptor';

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
import { NotificationsModule } from './modules/notification/notifications.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL !== 'production' ? 'debug' : 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [
        appConfig,
        jwtConfig,
        databaseConfig,
        mailConfig,
        paymentConfig,
      ],
    }),

    PrismaModule,
    EventBusModule,
    CommonModule,
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
    NotificationsModule,
  ],

  providers: [
    {
      provide: APP_FILTER,
      useClass: BaseExceptionFilter,
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
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: RolesAndPermissionsGuard,
    },
  ],
})
export class AppModule {}
