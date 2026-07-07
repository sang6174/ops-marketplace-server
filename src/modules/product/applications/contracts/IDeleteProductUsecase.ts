import {
  BulkUpdateStatusInput,
  ProductResponse,
} from '@modules/product/interfaces/dtos/product.dto';

export interface DeleteProductInput {
  productId: string;
  sellerId: string;
}

export interface IDeleteProductUseCase {
  execute(input: DeleteProductInput): Promise<void>;
}

export interface IBulkUpdateProductStatusUseCase {
  execute(input: BulkUpdateStatusInput): Promise<ProductResponse[]>;
}
