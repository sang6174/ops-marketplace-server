// src/module/payout/payout.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import { LedgerModule } from '../ledger/ledger.module';
import {
  PayoutsController,
  SellerPayoutsController,
} from './payouts.controller';
import { PayoutsService } from './payouts.service';
import {
  PayoutPrismaRepository,
  PAYOUT_PRISMA_REPOSITORY,
} from './infrastructure/repositories/payout-prisma.repository';

@Module({
  imports: [PrismaModule, LedgerModule],
  controllers: [PayoutsController, SellerPayoutsController],
  providers: [
    PayoutsService,
    PayoutPrismaRepository,
    { provide: PAYOUT_PRISMA_REPOSITORY, useClass: PayoutPrismaRepository },
  ],
  exports: [PayoutsService, PAYOUT_PRISMA_REPOSITORY],
})
export class PayoutsModule {}
