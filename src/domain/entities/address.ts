import {
  IProvince,
  IDistrict,
  IWard,
  IAddress,
} from '../interfaces/address.interface';

export class Province implements IProvince {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly code?: string,
  ) {}
}

export class District implements IDistrict {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly provinceId: number,
    public readonly code?: string,
  ) {}
}

export class Ward implements IWard {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly districtId: number,
    public readonly code?: string,
  ) {}
}

export class Address implements IAddress {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly ward: Ward,
    public readonly street: string,
    public readonly isDefault: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly detail?: string,
  ) {}
}
