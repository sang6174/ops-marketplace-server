export interface CreateAddressInput {
  userId: string;
  countryCode: string;
  provinceCode: string;
  districtCode?: string;
  wardCode?: string;
  street: string;
  postalCode: string;
  detail?: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  addressId: string;
  userId: string;
  countryCode?: string;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
  street?: string;
  postalCode?: string;
  detail?: string;
  isDefault?: boolean;
}

export interface AddressResponse {
  id: string;
  userId: string;
  countryCode: string;
  provinceCode: string;
  provinceName: string;
  districtCode?: string;
  districtName?: string;
  wardCode?: string;
  wardName?: string;
  street: string;
  postalCode: string;
  detail?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
