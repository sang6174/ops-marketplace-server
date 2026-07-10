import { BankAccount } from './BankAccount';
import { BankAccountNotFoundException } from '../../exceptions/DomainExceptions';

export class UserFinancialProfile {
  private constructor(
    public readonly userId: string,
    private _accounts: BankAccount[] = [],
    public updatedAt: Date,
  ) {
    this._accounts = [..._accounts];
  }

  static create(props: {
    userId: string;
    accounts?: BankAccount[];
    updatedAt?: Date;
  }): UserFinancialProfile {
    return new UserFinancialProfile(
      props.userId,
      props.accounts || [],
      props.updatedAt || new Date(),
    );
  }

  static reconstitute(props: {
    userId: string;
    accounts: BankAccount[];
    updatedAt: Date;
  }): UserFinancialProfile {
    return new UserFinancialProfile(
      props.userId,
      props.accounts,
      props.updatedAt,
    );
  }

  get accounts(): ReadonlyArray<BankAccount> {
    return this._accounts;
  }

  getDefaultAccount(): BankAccount | undefined {
    return this._accounts.find((acc) => acc.isDefault);
  }

  setDefaultBankAccount(accountId: string, updateAt: Date): void {
    let targetExists = false;

    for (const account of this._accounts) {
      if (account.id === accountId) {
        account.markAsDefault();
        targetExists = true;
      } else {
        if (account.isDefault) {
          account.unmarkAsDefault();
        }
      }
    }

    if (!targetExists) {
      throw new BankAccountNotFoundException(accountId);
    }

    this.updatedAt = updateAt;
  }

  addBankAccount(newAccount: BankAccount): void {
    if (newAccount.isDefault) {
      const existingDefault = this.getDefaultAccount();
      if (existingDefault) {
        existingDefault.unmarkAsDefault();
      }
    } else {
      if (this._accounts.length === 0) {
        if (!this.getDefaultAccount()) {
          newAccount.markAsDefault();
        }
      }
    }

    if (this._accounts.some((acc) => acc.id === newAccount.id)) {
      throw new Error('Account already exists');
    }

    this._accounts.push(newAccount);
  }

  removeBankAccount(accountId: string): void {
    const account = this._accounts.find((acc) => acc.id === accountId);
    if (!account) {
      throw new BankAccountNotFoundException(accountId);
    }

    if (!account.canBeDeleted()) {
      throw new Error('Cannot delete default bank account');
    }

    this._accounts = this._accounts.filter((acc) => acc.id !== accountId);

    if (this._accounts.length > 0 && !this.getDefaultAccount()) {
      this._accounts[0].markAsDefault();
    }
  }
}
