import { Injectable, Logger } from '@nestjs/common';
import { OnDomainEvent } from '../event-bus.decorator';
import {
  OrderCreated,
  OrderPaid,
  OrderShipped,
  OrderCancelled,
  OrderDelivered,
} from '@domain/events/OrderEvents';

@Injectable()
export class OrderEventsHandler {
  private readonly logger = new Logger(OrderEventsHandler.name);

  @OnDomainEvent(OrderCreated)
  async handleOrderCreated(event: OrderCreated) {
    this.logger.log(`Order created: ${event.orderId}`);
  }

  @OnDomainEvent(OrderPaid)
  async handleOrderPaid(event: OrderPaid) {
    this.logger.log(`Order paid: ${event.orderId}`);
  }

  @OnDomainEvent(OrderShipped)
  async handleOrderShipped(event: OrderShipped) {
    this.logger.log(`Order shipped: ${event.orderId}`);
  }

  @OnDomainEvent(OrderCancelled)
  async handleOrderCancelled(event: OrderCancelled) {
    this.logger.log(`Order cancelled: ${event.orderId}`);
  }

  @OnDomainEvent(OrderDelivered)
  async handleOrderDelivered(event: OrderDelivered) {
    this.logger.log(`Order delivered: ${event.orderId}`);
  }
}
