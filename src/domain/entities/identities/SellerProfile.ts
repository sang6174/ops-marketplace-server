import { UserId } from '../../value-objects/UserId';
import { FarmName } from '../../value-objects/FarmName';
import { Address } from '../../value-objects/Address';
import { TaxId } from '../../value-objects/TaxId';
import { BankAccountNumber } from '../../value-objects/BankAccountNumber';
import { Rating } from '../../value-objects/Rating';
import { BusinessLicense } from '../../value-objects/BusinessLicense';

export class SellerProfile {
  private constructor(
    public readonly id: string, // có thể là SellerProfileId
    public readonly userId: UserId,
    private _farmName: FarmName,
    private _addresses: Address[],
    private _taxId: TaxId,
    private _businessLicense: BusinessLicense,
    private _bankAccount: BankAccountNumber,
    private _isVerified: boolean,
    private _rating: Rating,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: {
    id: string;
    userId: UserId;
    farmName: FarmName;
    addresses: Address[];
    taxId: TaxId;
    businessLicense: BusinessLicense;
    bankAccount: BankAccountNumber;
    isVerified?: boolean;
    rating?: Rating;
    createdAt?: Date;
  }): SellerProfile {
    const now = props.createdAt || new Date();
    return new SellerProfile(
      props.id,
      props.userId,
      props.farmName,
      props.addresses,
      props.taxId,
      props.businessLicense,
      props.bankAccount,
      props.isVerified ?? false,
      props.rating ?? Rating.fromNumber(0),
      now,
      now,
    );
  }

  static reconstitute(props: {
    id: string;
    userId: UserId;
    farmName: FarmName;
    addresses: Address[];
    taxId: TaxId;
    businessLicense: BusinessLicense;
    bankAccount: BankAccountNumber;
    isVerified: boolean;
    rating: Rating;
    createdAt: Date;
    updatedAt: Date;
  }): SellerProfile {
    return new SellerProfile(
      props.id,
      props.userId,
      props.farmName,
      props.addresses,
      props.taxId,
      props.businessLicense,
      props.bankAccount,
      props.isVerified,
      props.rating,
      props.createdAt,
      props.updatedAt,
    );
  }

  get farmName(): FarmName {
    return this._farmName;
  }
  get addresses(): Address[] {
    return [...this._addresses];
  }
  get taxId(): TaxId {
    return this._taxId;
  }
  get businessLicense(): BusinessLicense {
    return this._businessLicense;
  }
  get bankAccount(): BankAccountNumber {
    return this._bankAccount;
  }
  get isVerified(): boolean {
    return this._isVerified;
  }
  get rating(): Rating {
    return this._rating;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  changeFarmName(newName: FarmName): void {
    this._farmName = newName;
    this._touch();
  }

  updateAddresses(addresses: Address[]): void {
    this._addresses = addresses;
    this._touch();
  }

  changeTaxId(newTaxId: TaxId): void {
    this._taxId = newTaxId;
    this._touch();
  }

  changeBusinessLicense(newLicense: BusinessLicense): void {
    this._businessLicense = newLicense;
    this._touch();
  }

  changeBankAccount(newAccount: BankAccountNumber): void {
    this._bankAccount = newAccount;
    this._touch();
  }

  verify(): void {
    if (!this._isVerified) {
      this._isVerified = true;
      this._touch();
    }
  }

  unverify(): void {
    if (this._isVerified) {
      this._isVerified = false;
      this._touch();
    }
  }

  updateRating(newRating: Rating): void {
    this._rating = newRating;
    this._touch();
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }
}
