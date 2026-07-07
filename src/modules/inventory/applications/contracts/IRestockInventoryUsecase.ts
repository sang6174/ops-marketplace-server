import {
  RestockInventoryInput,
  InventoryResponse,
} from '@modules/inventory/interfaces/dtos/inventory.dto';

export interface IRestockInventoryUseCase {
  execute(input: RestockInventoryInput): Promise<InventoryResponse>;
}
