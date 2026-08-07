import { Injectable, Inject } from '@nestjs/common';
import { IOrderRepository } from '@domain/repository-contracts/order-repository.contract';
import { ORDER_PRISMA_REPOSITORY } from '@modules/order/infrastructure/repositories/order-prisma.repository';
import { ResourceNotFoundException } from '@common/exceptions';
import {
  IGetOrdersUseCase,
  IGetOrderByIdUseCase,
  IGetOrdersByBuyerIdUseCase,
  IGetOrdersBySellerIdUseCase,
  IGetOrdersByShopIdUseCase,
  IGetOrdersByStatusUseCase,
  GetOrdersByBuyerIdInput,
  GetOrdersBySellerIdInput,
  GetOrdersByShopIdInput,
  GetOrdersByStatusInput,
} from '@modules/order/applications/contracts/IGetOrdersUsecase';
import {
  GetOrdersInput,
  GetOrderByIdInput,
  OrderResponse,
  OrderListResponse,
} from '@modules/order/interfaces/dtos/order.dto';
import { OrderMapper } from '@modules/order/interfaces/mappers/order.mapper';

@Injectable()
export class GetOrdersUseCase implements IGetOrdersUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: GetOrdersInput): Promise<OrderListResponse> {
    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;

    const orders = await this.orderRepo.findByBuyerId(input.userId, {
      status: input.status,
      limit,
      offset,
    });

    return OrderMapper.toListResponse(orders, orders.length, limit, offset);
  }
}

@Injectable()
export class GetOrderByIdUseCase implements IGetOrderByIdUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: GetOrderByIdInput): Promise<OrderResponse> {
    const order = await this.orderRepo.findById(input.orderId);

    if (!order) {
      throw new ResourceNotFoundException('Order', input.orderId);
    }

    return OrderMapper.toResponse(order);
  }
}

@Injectable()
export class GetOrdersByBuyerIdUseCase implements IGetOrdersByBuyerIdUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: GetOrdersByBuyerIdInput): Promise<OrderListResponse> {
    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;

    const orders = await this.orderRepo.findByBuyerId(input.buyerId, {
      status: input.status,
      limit,
      offset,
    });

    return OrderMapper.toListResponse(orders, orders.length, limit, offset);
  }
}

@Injectable()
export class GetOrdersBySellerIdUseCase implements IGetOrdersBySellerIdUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: GetOrdersBySellerIdInput): Promise<OrderListResponse> {
    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;

    const orders = await this.orderRepo.findBySellerId(input.sellerId, {
      status: input.status,
      limit,
      offset,
    });

    return OrderMapper.toListResponse(orders, orders.length, limit, offset);
  }
}

@Injectable()
export class GetOrdersByShopIdUseCase implements IGetOrdersByShopIdUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: GetOrdersByShopIdInput): Promise<OrderListResponse> {
    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;

    const orders = await this.orderRepo.findBySellerId(input.shopId, {
      status: input.status,
      limit,
      offset,
    });

    const filtered = orders.filter((order) =>
      order.items.some((item) => item.shopId === input.shopId),
    );

    return OrderMapper.toListResponse(filtered, filtered.length, limit, offset);
  }
}

@Injectable()
export class GetOrdersByStatusUseCase implements IGetOrdersByStatusUseCase {
  constructor(
    @Inject(ORDER_PRISMA_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: GetOrdersByStatusInput): Promise<OrderListResponse> {
    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;

    const orders = await this.orderRepo.findByStatus(input.status);

    const paginated = orders.slice(offset, offset + limit);

    return OrderMapper.toListResponse(paginated, orders.length, limit, offset);
  }
}
