import {
  CheckAvailabilityInput,
  InventoryAvailabilityResponse,
} from '@modules/inventory/interfaces/dtos/inventory.dto';

export interface ICheckInventoryAvailabilityUseCase {
  execute(
    input: CheckAvailabilityInput,
  ): Promise<InventoryAvailabilityResponse>;
}
