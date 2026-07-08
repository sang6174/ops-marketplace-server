// domain/entities/BankAccount.ts

export class BankAccount {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    private _bankName: string,
    private _accountNo: string,
    private _accountName: string,
    private _isDefault: boolean,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    userId: string;
    bankName: string;
    accountNo: string;
    accountName: string;
    isDefault?: boolean;
  }): BankAccount {
    return new BankAccount(
      crypto.randomUUID(),
      props.userId,
      props.bankName,
      props.accountNo,
      props.accountName,
      props.isDefault || false,
      new Date(),
    );
  }

  get bankName(): string {
    return this._bankName;
  }
  get accountNo(): string {
    return this._accountNo;
  }
  get accountName(): string {
    return this._accountName;
  }
  get isDefault(): boolean {
    return this._isDefault;
  }

  setDefault(): void {
    this._isDefault = true;
  }

  unsetDefault(): void {
    this._isDefault = false;
  }

  equals(other: BankAccount): boolean {
    if (!(other instanceof BankAccount)) {
      return false;
    }
    return this.id === other.id;
  }
}
