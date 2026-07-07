import {
  CreateCategoryInput,
  CategoryResponse,
} from '../../interface/dtos/categories.dto';

export interface ICreateCategoryUseCase {
  execute(input: CreateCategoryInput): Promise<CategoryResponse>;
}
