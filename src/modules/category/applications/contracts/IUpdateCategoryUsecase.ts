import {
  UpdateCategoryInput,
  CategoryResponse,
} from '../../interface/dtos/categories.dto';

export interface IUpdateCategoryUseCase {
  execute(id: string, input: UpdateCategoryInput): Promise<CategoryResponse>;
}
