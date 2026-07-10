import { UserId } from '../../value-objects/UserId';
import { Address } from '../../value-objects/Address';
import { LoyaltyPoints } from '../../value-objects/LoyaltyPoint';
import { TaxId } from '../../value-objects/TaxId';
import { BusinessLicense } from '../../value-objects/BusinessLicense';
import { CompanyName } from '../../value-objects/CompanyName';
import { BuyerType } from '../enums.enum';

export class BuyerProfile {
  private constructor(
    public readonly id: string,
    public readonly userId: UserId,
    private _buyerType: BuyerType,
    private _addresses: Address[],
    private _loyaltyPoints: LoyaltyPoints,
    private _taxId: TaxId | null,
    private _companyName: CompanyName | null,
    private _businessLicense: BusinessLicense | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: {
    id: string;
    userId: UserId;
    buyerType: BuyerType;
    addresses: Address[];
    loyaltyPoints?: LoyaltyPoints;
    taxId?: TaxId | null;
    companyName?: CompanyName | null;
    businessLicense?: BusinessLicense | null;
    createdAt?: Date;
  }): BuyerProfile {
    const now = props.createdAt || new Date();
    return new BuyerProfile(
      props.id,
      props.userId,
      props.buyerType,
      props.addresses,
      props.loyaltyPoints ?? LoyaltyPoints.zero(),
      props.taxId ?? null,
      props.companyName ?? null,
      props.businessLicense ?? null,
      now,
      now,
    );
  }

  static reconstitute(props: {
    id: string;
    userId: UserId;
    buyerType: BuyerType;
    addresses: Address[];
    loyaltyPoints: LoyaltyPoints;
    taxId: TaxId | null;
    companyName: CompanyName | null;
    businessLicense: BusinessLicense | null;
    createdAt: Date;
    updatedAt: Date;
  }): BuyerProfile {
    return new BuyerProfile(
      props.id,
      props.userId,
      props.buyerType,
      props.addresses,
      props.loyaltyPoints,
      props.taxId,
      props.companyName,
      props.businessLicense,
      props.createdAt,
      props.updatedAt,
    );
  }

  // Getters
  get buyerType(): BuyerType {
    return this._buyerType;
  }
  get addresses(): Address[] {
    return [...this._addresses];
  }
  get loyaltyPoints(): LoyaltyPoints {
    return this._loyaltyPoints;
  }
  get taxId(): TaxId | null {
    return this._taxId;
  }
  get companyName(): CompanyName | null {
    return this._companyName;
  }
  get businessLicense(): BusinessLicense | null {
    return this._businessLicense;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Behaviors
  changeBuyerType(newType: BuyerType): void {
    this._buyerType = newType;
    this._touch();
  }

  updateAddresses(addresses: Address[]): void {
    this._addresses = addresses;
    this._touch();
  }

  updateTaxId(taxId: TaxId | null): void {
    this._taxId = taxId;
    this._touch();
  }

  updateCompanyName(name: CompanyName | null): void {
    this._companyName = name;
    this._touch();
  }

  updateBusinessLicense(license: BusinessLicense | null): void {
    this._businessLicense = license;
    this._touch();
  }

  addLoyaltyPoints(points: LoyaltyPoints): void {
    this._loyaltyPoints = this._loyaltyPoints.add(points);
    this._touch();
  }

  redeemLoyaltyPoints(points: LoyaltyPoints): void {
    this._loyaltyPoints = this._loyaltyPoints.subtract(points);
    this._touch();
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }
}
