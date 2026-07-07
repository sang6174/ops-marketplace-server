import {
  UpdateProductInfoInput,
  ProductResponse,
  UpdateProductPriceInput,
  UpdateProductStatusInput,
  UpdateSeasonalInfoInput,
} from '@modules/product/interfaces/dtos/product.dto';

export interface IUpdateProductInfoUseCase {
  execute(input: UpdateProductInfoInput): Promise<ProductResponse>;
}

export interface IUpdateProductPriceUseCase {
  execute(input: UpdateProductPriceInput): Promise<ProductResponse>;
}

export interface IUpdateProductStatusUseCase {
  execute(input: UpdateProductStatusInput): Promise<ProductResponse>;
}

export interface IUpdateSeasonalInfoUseCase {
  execute(input: UpdateSeasonalInfoInput): Promise<ProductResponse>;
}

export interface PublishProductInput {
  productId: string;
  sellerId: string;
}

export interface IApproveProductUseCase {
  execute(productId: string, adminId: string): Promise<ProductResponse>;
}

export interface IRejectProductUseCase {
  execute(productId: string, adminId: string): Promise<ProductResponse>;
}

export interface IPublishProductUseCase {
  execute(input: PublishProductInput): Promise<ProductResponse>;
}

export interface IUnpublishProductUseCase {
  execute(input: PublishProductInput): Promise<ProductResponse>;
}
