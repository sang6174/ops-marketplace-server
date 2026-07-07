import {
  UpdateOrderStatusInput,
  OrderResponse,
  UpdateShippingAddressInput,
} from '@modules/order/interfaces/dtos/order.dto';
import { PaymentStatus } from '@domain/entities/enums.enum';

export interface IUpdateOrderStatusUseCase {
  execute(input: UpdateOrderStatusInput): Promise<OrderResponse>;
}

export interface ShipOrderInput {
  orderId: string;
  userId: string;
  trackingNumber?: string;
  courier?: string;
}

export interface IShipOrderUseCase {
  execute(input: ShipOrderInput): Promise<OrderResponse>;
}

export interface DeliverOrderInput {
  orderId: string;
  userId: string;
}

export interface IDeliverOrderUseCase {
  execute(input: DeliverOrderInput): Promise<OrderResponse>;
}

export interface UpdatePaymentStatusInput {
  orderId: string;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
}

export interface IUpdatePaymentStatusUseCase {
  execute(input: UpdatePaymentStatusInput): Promise<OrderResponse>;
}

export interface IUpdateShippingAddressUseCase {
  execute(input: UpdateShippingAddressInput): Promise<OrderResponse>;
}

export interface MarkOrderAsPaidInput {
  orderId: string;
  paymentIntentId: string;
}

export interface IMarkOrderAsPaidUseCase {
  execute(input: MarkOrderAsPaidInput): Promise<OrderResponse>;
}
