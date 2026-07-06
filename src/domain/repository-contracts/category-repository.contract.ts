// domain/repository-contracts/category-repository.interface.ts
import { Category } from '@domain/entities/category';
import { IBaseRepository } from './base-repository.interface';

export interface ICategoryRepository extends IBaseRepository<Category> {
  findBySlug(slug: string): Promise<Category | null>;
  findRoots(): Promise<Category[]>;
  findByParentId(parentId: string): Promise<Category[]>;
  findActive(): Promise<Category[]>;
  findActiveSorted(): Promise<Category[]>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  hasChildren(id: string): Promise<boolean>;
}
