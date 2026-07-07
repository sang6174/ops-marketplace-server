import {
  CreateProductInput,
  ProductResponse,
} from '@modules/product/interfaces/dtos/product.dto';
export interface ICreateProductUseCase {
  execute(input: CreateProductInput): Promise<ProductResponse>;
}
