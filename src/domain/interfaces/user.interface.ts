import { IAddress } from './address.interface';
import { BuyerType, UserRole, SubAdminRole } from '../entities/enums.enum';

export interface IUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly phoneNumber: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ISeller extends IUser {
  readonly farmName: string;
  readonly address: IAddress[];
  readonly taxId: string;
  readonly businessLicense: string;
  readonly bankAccount: string;
  readonly isVerified: boolean;
  readonly rating: number;
}

export interface IBuyer extends IUser {
  readonly buyerType: BuyerType;
  readonly address: IAddress[];
  readonly loyaltyPoints: number;
  readonly taxId?: string;
  readonly companyName?: string;
  readonly businessLicense?: string;
}

export interface IAdmin extends IUser {
  readonly role: UserRole;
  readonly subRole: SubAdminRole;
}
