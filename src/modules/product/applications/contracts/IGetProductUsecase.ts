import {
  GetProductByIdInput,
  ProductResponse,
  GetProductsInput,
  ProductListResponse,
} from '@modules/product/interfaces/dtos/product.dto';

export interface IGetProductByIdUseCase {
  execute(input: GetProductByIdInput): Promise<ProductResponse>;
}

export interface IGetProductsUseCase {
  execute(input: GetProductsInput): Promise<ProductListResponse>;
}
