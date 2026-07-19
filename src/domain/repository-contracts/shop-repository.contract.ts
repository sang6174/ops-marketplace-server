import { Shop } from '../entities/products/Shop';
import { IBaseRepository } from './base-repository.interface';

export interface IShopRepository extends IBaseRepository<Shop> {
  findByOwnerId(
    ownerId: string,
    options?: { includeDeleted?: boolean; limit?: number; offset?: number },
  ): Promise<Shop[]>;
  countByOwnerId(ownerId: string): Promise<number>;
  searchByName(searchTerm: string): Promise<Shop[]>;
  findByIds(ids: string[]): Promise<Shop[]>;
  existsByNameAndOwner(name: string, ownerId: string): Promise<boolean>;
  restore(id: string): Promise<void>;
}
