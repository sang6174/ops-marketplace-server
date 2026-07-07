export interface ISetDefaultAddressUseCase {
  execute(addressId: string, userId: string): Promise<void>;
}
