import { BankAccount } from '../entities/financial/BankAccount';
import { IBaseRepository } from './base-repository.interface';

export interface IBankAccountRepository extends IBaseRepository<BankAccount> {
  findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<BankAccount[]>;
  findDefaultByUserId(userId: string): Promise<BankAccount | null>;
  countByUserId(userId: string): Promise<number>;
  existsByUserId(userId: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<void>;
  unsetAllDefaultByUserId(userId: string): Promise<void>;
}
