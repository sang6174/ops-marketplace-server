import {
  CreatePayoutInput,
  MarkPayoutPaidInput,
  MarkPayoutFailedInput,
  GetPayoutsInput,
  PayoutResponse,
  PayoutListResponse,
} from '@modules/payout/interfaces/dtos/payout.dto';
import { Money } from '@/domain/entities/value-objects/money';

export interface ICreatePayoutUseCase {
  execute(input: CreatePayoutInput): Promise<PayoutResponse>;
}

export interface IMarkPayoutPaidUseCase {
  execute(input: MarkPayoutPaidInput): Promise<PayoutResponse>;
}

export interface IMarkPayoutFailedUseCase {
  execute(input: MarkPayoutFailedInput): Promise<PayoutResponse>;
}

export interface IGetPayoutByIdUseCase {
  execute(payoutId: string): Promise<PayoutResponse>;
}

export interface IGetPayoutsUseCase {
  execute(input: GetPayoutsInput): Promise<PayoutListResponse>;
}

export interface BatchPayoutInput {
  userIds: string[];
  amount: Money;
  method?: string;
}

export interface IBatchCreatePayoutsUseCase {
  execute(input: BatchPayoutInput): Promise<PayoutResponse[]>;
}

export interface IPayoutDashboardUseCase {
  execute(): Promise<{
    totalPending: number;
    totalPaid: number;
    totalFailed: number;
    totalAmountPending: Money;
    totalAmountPaid: Money;
  }>;
}

export interface IProcessPendingPayoutsUseCase {
  execute(): Promise<{
    processed: number;
    failed: number;
    totalAmount: Money;
  }>;
}
