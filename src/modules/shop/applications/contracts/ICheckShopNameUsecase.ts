export interface CheckShopNameInput {
  name: string;
  ownerId: string;
  excludeShopId?: string;
}

export interface ICheckShopNameAvailabilityUseCase {
  execute(input: CheckShopNameInput): Promise<{ available: boolean }>;
}
