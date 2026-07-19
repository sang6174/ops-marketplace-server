export interface GetUserInput {
  userId?: string;
  email?: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

export interface CreateAdminInput {
  email: string;
  password: string;
  subRole: string;
}

export interface CreateBuyerInput {
  email: string;
  password: string;
  buyerType?: string;
}

export interface CreateSellerInput {
  email: string;
  password: string;
  farmName: string;
}

export interface CreateShipperInput {
  email: string;
  password: string;
  vehicleType: string;
  licensePlate: string;
}

export interface UpdateUserInput {
  fullName?: string;
  phoneNumber?: string;
  avatar?: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  phone?: string;
}

export interface UpdateBuyerProfileInput {
  name?: string;
  email?: string;
  buyerType?: string;
}

export interface UpdateSellerProfileInput {
  name?: string;
  email?: string;
  farmName?: string;
}

export interface UpdateShipperProfileInput {
  name?: string;
  email?: string;
  vehicleType?: string;
}

export interface AddRoleInput {
  userId: string;
  role: string;
}

export interface RemoveRoleInput {
  userId: string;
  role: string;
}

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  avatar: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
