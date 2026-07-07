import {
  AddCertificationInput,
  ProductResponse,
  RemoveCertificationInput,
} from '@modules/product/interfaces/dtos/product.dto';

export interface IAddCertificationToProductUseCase {
  execute(input: AddCertificationInput): Promise<ProductResponse>;
}

export interface IRemoveCertificationFromProductUseCase {
  execute(input: RemoveCertificationInput): Promise<ProductResponse>;
}
