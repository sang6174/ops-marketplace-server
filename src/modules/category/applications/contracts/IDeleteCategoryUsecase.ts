export interface IDeleteCategoryUseCase {
  execute(id: string): Promise<void>;
}

export interface BulkDeleteCategoriesInput {
  ids: string[];
}

export interface IBulkDeleteCategoriesUseCase {
  execute(input: BulkDeleteCategoriesInput): Promise<void>;
}
