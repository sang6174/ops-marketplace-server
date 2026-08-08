import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import { LedgerModule } from '../ledger/ledger.module';
import { EventBusModule } from '@infrastructure/event-bus';
import { OrderEventsHandler } from '@infrastructure/event-bus/handlers/order-events.handler';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import {
  OrderPrismaRepository,
  ORDER_PRISMA_REPOSITORY,
} from './infrastructure/repositories/order-prisma.repository';
import {
  CreateOrderUseCase,
  AddNoteToOrderUseCase,
  GetOrdersUseCase,
  GetOrderByIdUseCase,
  GetOrdersByBuyerIdUseCase,
  GetOrdersBySellerIdUseCase,
  GetOrdersByShopIdUseCase,
  GetOrdersByStatusUseCase,
  UpdateOrderStatusUseCase,
  UpdatePaymentStatusUseCase,
  ShipOrderUseCase,
  DeliverOrderUseCase,
  UpdateShippingAddressUseCase,
  MarkOrderAsPaidUseCase,
  CancelOrderUseCase,
} from './applications/use-cases';

@Module({
  imports: [PrismaModule, LedgerModule, EventBusModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderEventsHandler,
    OrderPrismaRepository,
    { provide: ORDER_PRISMA_REPOSITORY, useClass: OrderPrismaRepository },
    CreateOrderUseCase,
    AddNoteToOrderUseCase,
    GetOrdersUseCase,
    GetOrderByIdUseCase,
    GetOrdersByBuyerIdUseCase,
    GetOrdersBySellerIdUseCase,
    GetOrdersByShopIdUseCase,
    GetOrdersByStatusUseCase,
    UpdateOrderStatusUseCase,
    UpdatePaymentStatusUseCase,
    ShipOrderUseCase,
    DeliverOrderUseCase,
    UpdateShippingAddressUseCase,
    MarkOrderAsPaidUseCase,
    CancelOrderUseCase,
  ],
  exports: [
    OrdersService,
    ORDER_PRISMA_REPOSITORY,
    CreateOrderUseCase,
    AddNoteToOrderUseCase,
    GetOrdersUseCase,
    GetOrderByIdUseCase,
    GetOrdersByBuyerIdUseCase,
    GetOrdersBySellerIdUseCase,
    GetOrdersByShopIdUseCase,
    GetOrdersByStatusUseCase,
    UpdateOrderStatusUseCase,
    UpdatePaymentStatusUseCase,
    ShipOrderUseCase,
    DeliverOrderUseCase,
    UpdateShippingAddressUseCase,
    MarkOrderAsPaidUseCase,
    CancelOrderUseCase,
  ],
})
export class OrdersModule {}
