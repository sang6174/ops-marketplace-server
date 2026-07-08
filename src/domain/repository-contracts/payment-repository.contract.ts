// domain/repository-contracts/payment-repository.interface.ts
import { Payment } from '@domain/entities/payment';
import { PaymentStatus } from '@domain/entities/enums.enum';
import { IBaseRepository } from './base-repository.interface';
export interface IPaymentRepository extends IBaseRepository<Payment> {
  findByOrderId(orderId: string): Promise<Payment | null>;
  findMany(options?: {
    orderId?: string;
    status?: PaymentStatus;
    gateway?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Payment[]>;
  count(options?: {
    orderId?: string;
    status?: PaymentStatus;
    gateway?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<number>;
  findByStatus(status: PaymentStatus): Promise<Payment[]>;
  findByGateway(gateway: string): Promise<Payment[]>;
  existsByOrderId(orderId: string): Promise<boolean>;
  deleteByOrderId(orderId: string): Promise<void>;
}
