import { Address } from './address';
import { BuyerType, UserRole, SubAdminRole } from './enums.enum';

export abstract class User {
  constructor(
    public readonly id: string,
    public email: string,
    public fullName: string,
    public phoneNumber: string,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}

export class Seller extends User {
  constructor(
    public readonly id: string,
    public email: string,
    public fullName: string,
    public phoneNumber: string,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt: Date,
    public farmName: string,
    public address: Address[],
    public taxId: string,
    public businessLicense: string,
    public bankAccount: string,
    public isVerified: boolean,
    public rating: number,
  ) {
    super(id, email, fullName, phoneNumber, isActive, createdAt, updatedAt);
  }
}

export class Buyer extends User {
  constructor(
    public readonly id: string,
    public email: string,
    public fullName: string,
    public phoneNumber: string,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt: Date,
    public buyerType: BuyerType,
    public address: Address[],
    public loyaltyPoints: number,
    public taxId?: string,
    public companyName?: string,
    public businessLicense?: string,
  ) {
    super(id, email, fullName, phoneNumber, isActive, createdAt, updatedAt);
  }
}

export class Admin extends User {
  constructor(
    public readonly id: string,
    public email: string,
    public fullName: string,
    public phoneNumber: string,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt: Date,
    public role: UserRole,
    public subRole: SubAdminRole,
  ) {
    super(id, email, fullName, phoneNumber, isActive, createdAt, updatedAt);
  }
}
