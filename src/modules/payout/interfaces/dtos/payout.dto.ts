import { Money } from '@domain/entities/value-objects/money';
import { PayoutStatus } from '@domain/entities/enums.enum';

export interface CreatePayoutInput {
  userId: string;
  amount: Money;
  method?: string;
}

export interface MarkPayoutPaidInput {
  payoutId: string;
  reference: string;
}

export interface MarkPayoutFailedInput {
  payoutId: string;
}

export interface GetPayoutsInput {
  userId?: string;
  status?: PayoutStatus;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface PayoutResponse {
  id: string;
  userId: string;
  amount: Money;
  status: PayoutStatus;
  method: string | null;
  reference: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface PayoutListResponse {
  items: PayoutResponse[];
  total: number;
  limit: number;
  offset: number;
}
