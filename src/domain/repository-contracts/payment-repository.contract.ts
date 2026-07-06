// domain/repository-contracts/payment-repository.interface.ts
import { Payment } from '@domain/entities/payment';
import { PaymentStatus } from '@domain/entities/enums.enum';
import { IBaseRepository } from './base-repository.interface';

export interface IPaymentRepository extends IBaseRepository<Payment> {
  findByOrderId(orderId: string): Promise<Payment | null>;
  findByPaymentIntentId(paymentIntentId: string): Promise<Payment | null>;
  findByStatus(status: PaymentStatus): Promise<Payment[]>;
  findByGateway(gateway: string): Promise<Payment[]>;
  findPendingSince(date: Date): Promise<Payment[]>;
}
