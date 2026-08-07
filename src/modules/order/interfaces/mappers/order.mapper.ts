import { Order, OrderItem } from '@domain/entities/orders/Order';
import {
  OrderResponse,
  OrderItemResponse,
  OrderListResponse,
} from '@modules/order/interfaces/dtos/order.dto';

export class OrderMapper {
  static toItemResponse(item: OrderItem): OrderItemResponse {
    return {
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      retailPrice: item.retailPrice,
      wholesalePrice: item.wholesalePrice,
      totalPrice: item.getTotalPrice(),
      effectivePrice: item.getEffectivePrice(),
    };
  }

  static toResponse(order: Order): OrderResponse {
    return {
      id: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      orderType: order.orderType,
      items: order.items.map(OrderMapper.toItemResponse),
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      grandTotal: order.grandTotal,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      paymentIntentId: order.paymentIntentId,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  static toListResponse(
    orders: Order[],
    total: number,
    limit: number,
    offset: number,
  ): OrderListResponse {
    return {
      items: orders.map(OrderMapper.toResponse),
      total,
      limit,
      offset,
    };
  }
}
