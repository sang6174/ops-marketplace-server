import {
  CreateInventoryInput,
  InventoryResponse,
} from '@modules/inventory/interfaces/dtos/inventory.dto';

export interface ICreateInventoryUseCase {
  execute(input: CreateInventoryInput): Promise<InventoryResponse>;
}
