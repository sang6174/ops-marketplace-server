import { BankName } from '../../value-objects/BankName';
import { BankAccountNumber } from '../../value-objects/BankAccountNumber';
import { AccountHolderName } from '../../value-objects/BankAccountHolderName';

export class BankAccount {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    private _bankName: BankName,
    private _accountNo: BankAccountNumber,
    private _accountName: AccountHolderName,
    private _isDefault: boolean,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    userId: string;
    bankName: BankName;
    accountNo: BankAccountNumber;
    accountName: AccountHolderName;
    isDefault: boolean;
    createdAt: Date;
  }): BankAccount {
    return new BankAccount(
      props.id,
      props.userId,
      props.bankName,
      props.accountNo,
      props.accountName,
      props.isDefault,
      props.createdAt,
    );
  }

  get bankName(): BankName {
    return this._bankName;
  }
  get accountNo(): BankAccountNumber {
    return this._accountNo;
  }
  get accountName(): AccountHolderName {
    return this._accountName;
  }
  get isDefault(): boolean {
    return this._isDefault;
  }

  /** @internal */
  markAsDefault(): void {
    this._isDefault = true;
  }

  /** @internal */
  unmarkAsDefault(): void {
    this._isDefault = false;
  }

  canBeDeleted(): boolean {
    return !this._isDefault;
  }

  equals(other: BankAccount): boolean {
    if (!(other instanceof BankAccount)) return false;
    return this.id === other.id;
  }

  static reconstitute(props: {
    id: string;
    userId: string;
    bankName: BankName;
    accountNo: BankAccountNumber;
    accountName: AccountHolderName;
    isDefault: boolean;
    createdAt: Date;
  }): BankAccount {
    return new BankAccount(
      props.id,
      props.userId,
      props.bankName,
      props.accountNo,
      props.accountName,
      props.isDefault,
      props.createdAt,
    );
  }
}
