// domain/repository-contracts/order-repository.interface.ts
import { Order } from '@domain/entities/order';
import { OrderStatus, PaymentStatus } from '@domain/entities/enums.enum';
import { IBaseRepository } from './base-repository.interface';

export interface IOrderRepository extends IBaseRepository<Order> {
  findByBuyerId(buyerId: string): Promise<Order[]>;
  findBySellerId(sellerId: string): Promise<Order[]>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
  findByPaymentStatus(status: PaymentStatus): Promise<Order[]>;
  findBySellerAndStatus(
    sellerId: string,
    status: OrderStatus,
  ): Promise<Order[]>;
  findByBuyerAndStatus(buyerId: string, status: OrderStatus): Promise<Order[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;
  findByPaymentIntent(paymentIntentId: string): Promise<Order | null>;
  getTotalSalesForSeller(
    sellerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number>;
}
