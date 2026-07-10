import { OrderStatus } from '../entities/enums.enum';
export class OrderState {
  private constructor(private readonly _value: OrderStatus) {}

  static pending(): OrderState {
    return new OrderState(OrderStatus.PENDING);
  }
  static confirmed(): OrderState {
    return new OrderState(OrderStatus.CONFIRMED);
  }
  static shipped(): OrderState {
    return new OrderState(OrderStatus.SHIPPED);
  }
  static delivered(): OrderState {
    return new OrderState(OrderStatus.DELIVERED);
  }
  static cancelled(): OrderState {
    return new OrderState(OrderStatus.CANCELLED);
  }
  static refunded(): OrderState {
    return new OrderState(OrderStatus.REFUNDED);
  }

  get value(): OrderStatus {
    return this._value;
  }

  equals(other: OrderState): boolean {
    return other instanceof OrderState && this._value === other._value;
  }

  canTransitionTo(newState: OrderState): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.PROCESSING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    };
    return transitions[this._value]?.includes(newState.value) || false;
  }
}
