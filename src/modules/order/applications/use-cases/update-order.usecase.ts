import { Injectable, Inject } from '@nestjs/common';
import { NestEventBus } from '@infrastructure/event-bus';
import {
  OrderShipped,
  OrderDelivered,
  OrderCancelled,
} from '@domain/events/OrderEvents';
import { OrderId } from '@domain/value-objects/OrderId';
import { BuyerId } from '@domain/value-objects/BuyerId';
import { IOrderRepository } from '@domain/repository-contracts/order-repository.contract';
import { ORDER_PRISMA_REPOSITORY } from '@modules/order/infrastructure/repositories/order-prisma.repository';
import { ResourceNotFoundException } from '@common/exceptions';
import {
  IUpdateOrderStatusUseCase,
  IUpdatePaymentStatusUseCase,
  IShipOrderUseCase,
  IDeliverOrderUseCase,
  IUpdateShippingAddressUseCase,
  IMarkOrderAsPaidUseCase,
  ShipOrderInput,
  DeliverOrderInput,
  UpdatePaymentStatusInput,
  MarkOrderAsPaidInput,
} from '@modules/order/applications/contracts/IUpdateOrderUsecase';
import {
  UpdateOrderStatusInput,
  UpdateShippingAddressInput,
  OrderResponse,
} from '@modules/order/interfaces/dtos/order.dto';
import { OrderMapper } from '@modules/order/interfaces/mappers/order.mapper';

@Injectable()
export class UpdateOrderStatusUseCase implements IUpdateOrderStatusUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
    private readonly eventBus: NestEventBus,
  ) {}

  async execute(input: UpdateOrderStatusInput): Promise<OrderResponse> {
    const order = await this.orderRepo.findById(input.orderId);

    if (!order) {
      throw new ResourceNotFoundException('Order', input.orderId);
    }

    order.updateOrderStatus(input.status);
    const saved = await this.orderRepo.save(order);

    if (input.status === 'SHIPPED' as any) {
      await this.eventBus.publish(
        new OrderShipped(
          OrderId.create(saved.id),
          BuyerId.create(saved.buyerId),
          saved.shippedAt ?? new Date(),
        ),
      );
    }

    if (input.status === 'DELIVERED' as any) {
      await this.eventBus.publish(
        new OrderDelivered(
          OrderId.create(saved.id),
          BuyerId.create(saved.buyerId),
          saved.deliveredAt ?? new Date(),
          new Date(),
        ),
      );
    }

    if (input.status === 'CANCELLED' as any) {
      await this.eventBus.publish(
        new OrderCancelled(
          OrderId.create(saved.id),
          BuyerId.create(saved.buyerId),
          undefined,
          'SELLER',
          saved.cancelledAt ?? new Date(),
        ),
      );
    }

    return OrderMapper.toResponse(saved);
  }
}

@Injectable()
export class UpdatePaymentStatusUseCase implements IUpdatePaymentStatusUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: UpdatePaymentStatusInput): Promise<OrderResponse> {
    const order = await this.orderRepo.findById(input.orderId);

    if (!order) {
      throw new ResourceNotFoundException('Order', input.orderId);
    }

    order.updatePaymentStatus(input.paymentStatus);

    if (input.paymentIntentId) {
      order.setPaymentIntent(input.paymentIntentId);
    }

    const saved = await this.orderRepo.save(order);

    return OrderMapper.toResponse(saved);
  }
}

@Injectable()
export class ShipOrderUseCase implements IShipOrderUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
    private readonly eventBus: NestEventBus,
  ) {}

  async execute(input: ShipOrderInput): Promise<OrderResponse> {
    const order = await this.orderRepo.findById(input.orderId);

    if (!order) {
      throw new ResourceNotFoundException('Order', input.orderId);
    }

    order.ship();
    const saved = await this.orderRepo.save(order);

    await this.eventBus.publish(
      new OrderShipped(
        OrderId.create(saved.id),
        BuyerId.create(saved.buyerId),
        saved.shippedAt ?? new Date(),
        input.trackingNumber,
      ),
    );

    return OrderMapper.toResponse(saved);
  }
}

@Injectable()
export class DeliverOrderUseCase implements IDeliverOrderUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
    private readonly eventBus: NestEventBus,
  ) {}

  async execute(input: DeliverOrderInput): Promise<OrderResponse> {
    const order = await this.orderRepo.findById(input.orderId);

    if (!order) {
      throw new ResourceNotFoundException('Order', input.orderId);
    }

    order.deliver();
    const saved = await this.orderRepo.save(order);

    await this.eventBus.publish(
      new OrderDelivered(
        OrderId.create(saved.id),
        BuyerId.create(saved.buyerId),
        saved.deliveredAt ?? new Date(),
        new Date(),
      ),
    );

    return OrderMapper.toResponse(saved);
  }
}

@Injectable()
export class UpdateShippingAddressUseCase
  implements IUpdateShippingAddressUseCase
{
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: UpdateShippingAddressInput): Promise<OrderResponse> {
    const order = await this.orderRepo.findById(input.orderId);

    if (!order) {
      throw new ResourceNotFoundException('Order', input.orderId);
    }

    order.updateShippingAddress(input.newAddress);
    const saved = await this.orderRepo.save(order);

    return OrderMapper.toResponse(saved);
  }
}

@Injectable()
export class MarkOrderAsPaidUseCase implements IMarkOrderAsPaidUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: MarkOrderAsPaidInput): Promise<OrderResponse> {
    const order = await this.orderRepo.findById(input.orderId);

    if (!order) {
      throw new ResourceNotFoundException('Order', input.orderId);
    }

    order.markPaymentSucceeded(input.paymentIntentId);
    const saved = await this.orderRepo.save(order);

    return OrderMapper.toResponse(saved);
  }
}
