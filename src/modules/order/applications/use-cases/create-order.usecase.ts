import { Injectable, Inject } from '@nestjs/common';
import { Order } from '@domain/entities/orders/Order';
import { OrderId } from '@domain/value-objects/OrderId';
import { BuyerId } from '@domain/value-objects/BuyerId';
import { SellerId } from '@domain/value-objects/SellerId';
import { Money } from '@domain/value-objects/Money';
import { OrderCreated } from '@domain/events/OrderEvents';
import { NestEventBus } from '@infrastructure/event-bus';
import { IOrderRepository } from '@domain/repository-contracts/order-repository.contract';
import { ORDER_PRISMA_REPOSITORY } from '@modules/order/infrastructure/repositories/order-prisma.repository';
import { ResourceNotFoundException } from '@common/exceptions';
import {
  ICreateOrderUseCase,
  IAddNoteToOrderUseCase,
} from '@modules/order/applications/contracts/ICreateOrderUsecase';
import {
  CreateOrderInput,
  OrderResponse,
  AddNoteInput,
} from '@modules/order/interfaces/dtos/order.dto';
import { OrderMapper } from '@modules/order/interfaces/mappers/order.mapper';

@Injectable()
export class CreateOrderUseCase implements ICreateOrderUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
    private readonly eventBus: NestEventBus,
  ) {}

  async execute(input: CreateOrderInput): Promise<OrderResponse> {
    const order = Order.create({
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      orderType: input.orderType,
      subTotal: input.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
      shippingFee: 0,
      items: input.items.map((item) => ({
        shopId: input.sellerId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        wholesalePrice: item.wholesalePrice,
      })),
      shippingAddress: input.shippingAddress,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
    });

    const saved = await this.orderRepo.save(order);

    await this.eventBus.publish(
      new OrderCreated(
        OrderId.create(saved.id),
        BuyerId.create(saved.buyerId),
        SellerId.create(saved.sellerId),
        Money.fromDecimal(saved.grandTotal),
        saved.createdAt,
      ),
    );

    return OrderMapper.toResponse(saved);
  }
}

@Injectable()
export class AddNoteToOrderUseCase implements IAddNoteToOrderUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: AddNoteInput): Promise<OrderResponse> {
    const order = await this.orderRepo.findById(input.orderId);

    if (!order) {
      throw new ResourceNotFoundException('Order', input.orderId);
    }

    order.addNote(input.note);
    const saved = await this.orderRepo.save(order);

    return OrderMapper.toResponse(saved);
  }
}
