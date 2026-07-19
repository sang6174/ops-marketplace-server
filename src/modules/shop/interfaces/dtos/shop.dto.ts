export interface CreateShopInput {
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface UpdateShopInput {
  name?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: string;
}

export interface ShopResponse {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface GetShopsInput {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  ownerId?: string;
}

export interface GetShopsByOwnerInput {
  ownerId: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}
