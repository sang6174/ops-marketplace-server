import {
  OutboundInventoryInput,
  InventoryResponse,
} from '@modules/inventory/interfaces/dtos/inventory.dto';

export interface IOutboundInventoryUseCase {
  execute(input: OutboundInventoryInput): Promise<InventoryResponse>;
}
