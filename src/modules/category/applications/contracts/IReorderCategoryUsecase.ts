export interface ReorderCategoryInput {
  id: string;
  newSortOrder: number;
}

export interface IReorderCategoryUseCase {
  execute(input: ReorderCategoryInput): Promise<void>;
}
