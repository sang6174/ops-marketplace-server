import { Injectable, Inject } from '@nestjs/common';
import { NestEventBus } from '@infrastructure/event-bus';
import { OrderCancelled } from '@domain/events/OrderEvents';
import { OrderId } from '@domain/value-objects/OrderId';
import { BuyerId } from '@domain/value-objects/BuyerId';
import { IOrderRepository } from '@domain/repository-contracts/order-repository.contract';
import { ORDER_PRISMA_REPOSITORY } from '@modules/order/infrastructure/repositories/order-prisma.repository';
import { ResourceNotFoundException } from '@common/exceptions';
import { ICancelOrderUseCase } from '@modules/order/applications/contracts/ICancelOrderUsecase';
import {
  CancelOrderInput,
  OrderResponse,
} from '@modules/order/interfaces/dtos/order.dto';
import { OrderMapper } from '@modules/order/interfaces/mappers/order.mapper';

@Injectable()
export class CancelOrderUseCase implements ICancelOrderUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
    private readonly eventBus: NestEventBus,
  ) {}

  async execute(input: CancelOrderInput): Promise<OrderResponse> {
    const order = await this.orderRepo.findById(input.orderId);

    if (!order) {
      throw new ResourceNotFoundException('Order', input.orderId);
    }

    order.cancel(input.reason);
    const saved = await this.orderRepo.save(order);

    await this.eventBus.publish(
      new OrderCancelled(
        OrderId.create(saved.id),
        BuyerId.create(saved.buyerId),
        input.reason,
        'BUYER',
        saved.cancelledAt ?? new Date(),
      ),
    );

    return OrderMapper.toResponse(saved);
  }
}
