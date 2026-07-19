import { Money } from '@domain/value-objects/Money';
import { PayoutStatusEnum } from '@domain/entities/enums.enum';

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
  status?: PayoutStatusEnum;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface PayoutResponse {
  id: string;
  userId: string;
  amount: Money;
  status: PayoutStatusEnum;
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
