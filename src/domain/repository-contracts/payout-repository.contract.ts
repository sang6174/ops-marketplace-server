import { Payout } from '@domain/entities/payouts/Payout';
import { PayoutStatusEnum } from '@domain/entities/enums.enum';
import { IBaseRepository } from './base-repository.interface';

export interface IPayoutRepository extends IBaseRepository<Payout> {
  findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number; status?: PayoutStatusEnum },
  ): Promise<Payout[]>;

  findByStatus(status: PayoutStatusEnum): Promise<Payout[]>;
  findByDateRange(from: Date, to: Date): Promise<Payout[]>;

  countByUserId(userId: string, status?: PayoutStatusEnum): Promise<number>;

  existsByReference(reference: string): Promise<boolean>;
  findPendingOlderThan(date: Date): Promise<Payout[]>;

  deleteByUserId(userId: string): Promise<void>;
}
