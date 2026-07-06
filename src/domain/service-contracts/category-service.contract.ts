// domain/use-case-contracts/category.use-cases.ts
import { Category } from '@domain/entities/category';

export interface CreateCategoryInput {
  name: string;
  slug: string;
  parentId?: string;
  sortOrder?: number;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  parentId?: string;
  sortOrder?: number;
  description?: string;
  isActive?: boolean;
}

export interface ReorderCategoriesInput {
  categoryId: string;
  newSortOrder: number;
  parentId?: string;
}

export interface CategoryNode {
  category: Category;
  children: CategoryNode[];
}

export interface ICreateCategoryUseCase {
  execute(input: CreateCategoryInput): Promise<Category>;
}

export interface IUpdateCategoryUseCase {
  execute(id: string, input: UpdateCategoryInput): Promise<Category>;
}

export interface IDeleteCategoryUseCase {
  execute(id: string, force?: boolean): Promise<void>;
}

export interface IGetCategoryByIdUseCase {
  execute(id: string): Promise<Category | null>;
}

export interface IGetCategoryBySlugUseCase {
  execute(slug: string): Promise<Category | null>;
}

export interface IGetCategoryTreeUseCase {
  execute(includeInactive?: boolean): Promise<CategoryNode[]>;
}

export interface IGetActiveCategoriesUseCase {
  execute(): Promise<Category[]>;
}

export interface IReorderCategoriesUseCase {
  execute(input: ReorderCategoriesInput): Promise<void>;
}

export interface IBulkUpdateCategoriesUseCase {
  execute(ids: string[], data: Partial<UpdateCategoryInput>): Promise<void>;
}

export interface ISearchCategoriesUseCase {
  execute(query: string, limit?: number): Promise<Category[]>;
}
