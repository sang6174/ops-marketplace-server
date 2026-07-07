import {
  GetCategoriesInput,
  GetCategoryTreeInput,
  CategoryResponse,
  CategoryListResponse,
  CategoryTreeNode,
} from '../../interface/dtos/categories.dto';

export interface IGetCategoryByIdUseCase {
  execute(id: string): Promise<CategoryResponse>;
}

export interface IGetCategoryBySlugUseCase {
  execute(slug: string): Promise<CategoryResponse>;
}

export interface IGetCategoriesUseCase {
  execute(input: GetCategoriesInput): Promise<CategoryListResponse>;
}

export interface IGetCategoryTreeUseCase {
  execute(input: GetCategoryTreeInput): Promise<CategoryTreeNode[]>;
}
