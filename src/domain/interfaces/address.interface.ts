export interface IProvince {
  readonly id: number;
  readonly name: string;
  readonly code?: string; 
}

export interface IDistrict {
  readonly id: number;
  readonly name: string;
  readonly provinceId: number;
  readonly code?: string;
}

export interface IWard {
  readonly id: number;
  readonly name: string;
  readonly districtId: number;
  readonly code?: string;
}

export interface IAddress {
  readonly id: string;
  readonly userId: string;
  readonly ward: IWard;
  readonly street: string;
  readonly isDefault: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly detail?: string;
}
