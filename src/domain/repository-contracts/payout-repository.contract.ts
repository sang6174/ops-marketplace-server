import { Payout } from '@domain/entities/payout';
import { PayoutStatus } from '@domain/entities/enums.enum';
import { IBaseRepository } from './base-repository.interface';

export interface IPayoutRepository extends IBaseRepository<Payout> {
  findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number; status?: PayoutStatus },
  ): Promise<Payout[]>;

  findByStatus(status: PayoutStatus): Promise<Payout[]>;
  findByDateRange(from: Date, to: Date): Promise<Payout[]>;

  countByUserId(userId: string, status?: PayoutStatus): Promise<number>;

  existsByReference(reference: string): Promise<boolean>;
  findPendingOlderThan(date: Date): Promise<Payout[]>;

  deleteByUserId(userId: string): Promise<void>;
}
