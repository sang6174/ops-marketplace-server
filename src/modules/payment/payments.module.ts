// src/module/payment/payments.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import { LedgerModule } from '../ledger/ledger.module';
import { PaymentEventsHandler } from '@infrastructure/event-bus/handlers/payment-events.handler';
import { PaymentsService } from './payments.service';
import {
  PaymentsController,
  PaymentWebhooksController,
  RefundsController,
  SellerRefundsController,
} from './payments.controller';
import {
  PaymentPrismaRepository,
  PAYMENT_PRISMA_REPOSITORY,
} from './infrastructure/repositories/payment-prisma.repository';

@Module({
  imports: [PrismaModule, LedgerModule],
  controllers: [
    PaymentsController,
    PaymentWebhooksController,
    RefundsController,
    SellerRefundsController,
  ],
  providers: [
    PaymentsService,
    PaymentEventsHandler,
    PaymentPrismaRepository,
    { provide: PAYMENT_PRISMA_REPOSITORY, useClass: PaymentPrismaRepository },
  ],
  exports: [PaymentsService, PAYMENT_PRISMA_REPOSITORY],
})
export class PaymentsModule {}
