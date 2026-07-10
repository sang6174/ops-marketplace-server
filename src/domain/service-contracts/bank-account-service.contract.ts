import { BankAccount } from '../entities/financial/BankAccount';

export interface IBankAccountDomainService {
  validateBankAccount(props: {
    bankName: string;
    accountNo: string;
    accountName: string;
  }): { valid: boolean; errors: string[] };

  enforceSingleDefault(
    existingAccounts: BankAccount[],
    accountId: string,
    isDefault: boolean,
  ): { accountsToUpdate: { id: string; isDefault: boolean }[] };

  canAddMoreAccounts(
    currentCount: number,
    maxAllowed?: number,
  ): { allowed: boolean; reason?: string };

  canDeleteAccount(
    account: BankAccount,
    totalAccounts: number,
  ): { allowed: boolean; reason?: string };
}
