// src/module/payment/payments.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import { LedgerModule } from '../ledger/ledger.module';
import { PaymentsService } from './payments.service';
import {
  PaymentsController,
  PaymentWebhooksController,
  RefundsController,
  SellerRefundsController,
} from './payments.controller';

@Module({
  imports: [PrismaModule, LedgerModule],
  controllers: [
    PaymentsController,
    PaymentWebhooksController,
    RefundsController,
    SellerRefundsController,
  ],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
