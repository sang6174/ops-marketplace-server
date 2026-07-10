// domain/entities/order.ts
import { Address } from '../value-objects/address';
import { OrderStatus, OrderType, PaymentStatus } from './enums.enum';

export class OrderItem {
  constructor(
    public readonly shopId: string,
    public readonly productId: string,
    public productName: string,
    private _quantity: number,
    private _retailPrice: number,
    private _wholesalePrice?: number,
  ) {}

  get quantity(): number {
    return this._quantity;
  }

  get retailPrice(): number {
    return this._retailPrice;
  }

  get wholesalePrice(): number | undefined {
    return this._wholesalePrice;
  }

  getTotalPrice(): number {
    const price = this._wholesalePrice ?? this._retailPrice;
    return price * this._quantity;
  }

  changeQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    this._quantity = newQuantity;
  }

  getEffectivePrice(): number {
    return this._wholesalePrice ?? this._retailPrice;
  }
}

export class Order {
  private constructor(
    public readonly id: string,
    public readonly buyerId: string,
    public readonly sellerId: string,
    public readonly orderType: OrderType,
    private _items: OrderItem[],
    private _subtotal: number,
    private _shippingFee: number,
    private _grandTotal: number,
    public shippingAddress: Address,
    public paymentMethod: string,
    private _paymentStatus: PaymentStatus,
    private _orderStatus: OrderStatus,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    private _paymentIntentId?: string,
    private _shippedAt?: Date,
    private _deliveredAt?: Date,
    private _cancelledAt?: Date,
    private _notes?: string,
  ) {}

  get items(): OrderItem[] {
    return [...this._items];
  }

  get subtotal(): number {
    return this._subtotal;
  }

  get shippingFee(): number {
    return this._shippingFee;
  }

  get grandTotal(): number {
    return this._grandTotal;
  }

  get paymentStatus(): PaymentStatus {
    return this._paymentStatus;
  }

  get orderStatus(): OrderStatus {
    return this._orderStatus;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get paymentIntentId(): string | undefined {
    return this._paymentIntentId;
  }

  get shippedAt(): Date | undefined {
    return this._shippedAt;
  }

  get deliveredAt(): Date | undefined {
    return this._deliveredAt;
  }

  get cancelledAt(): Date | undefined {
    return this._cancelledAt;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  static create(input: {
    buyerId: string;
    sellerId: string;
    orderType: OrderType;
    subTotal: number;
    shippingFee: number;
    items: Array<{
      shopId: string;
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      wholesalePrice?: number;
    }>;
    shippingAddress: Address;
    paymentMethod: string;
    notes?: string;
  }): Order {
    if (!input.items || input.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    const orderItems = input.items.map(
      (item) =>
        new OrderItem(
          item.shopId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.wholesalePrice,
        ),
    );
    const grandTotal = input.subTotal + input.shippingFee;

    const now = new Date();
    return new Order(
      crypto.randomUUID(),
      input.buyerId,
      input.sellerId,
      input.orderType,
      orderItems,
      input.subTotal,
      input.shippingFee,
      grandTotal,
      input.shippingAddress,
      input.paymentMethod,
      PaymentStatus.PENDING,
      OrderStatus.PENDING,
      now,
      now,
      undefined,
      undefined,
      undefined,
      undefined,
      input.notes,
    );
  }

  canBeCancelled(): boolean {
    return [OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(
      this._orderStatus,
    );
  }

  updateOrderStatus(newStatus: OrderStatus): void {
    if (newStatus === this._orderStatus) {
      return;
    }

    if (this._orderStatus === OrderStatus.CANCELLED) {
      throw new Error('Cannot update a cancelled order');
    }
    if (this._orderStatus === OrderStatus.DELIVERED) {
      throw new Error('Cannot update a delivered order');
    }
    if (this._orderStatus === OrderStatus.REFUNDED) {
      throw new Error('Cannot update a refunded order');
    }

    if (newStatus === OrderStatus.SHIPPED) {
      if (this._paymentStatus !== PaymentStatus.SUCCEEDED) {
        throw new Error('Cannot ship order with pending or failed payment');
      }
      this._shippedAt = new Date();
    }
    if (newStatus === OrderStatus.DELIVERED) {
      if (this._paymentStatus !== PaymentStatus.SUCCEEDED) {
        throw new Error('Cannot deliver order with pending or failed payment');
      }
      this._deliveredAt = new Date();
    }
    if (newStatus === OrderStatus.CANCELLED) {
      if (!this.canBeCancelled()) {
        throw new Error(
          'Cannot cancel an order that has already been shipped or delivered',
        );
      }
      this._cancelledAt = new Date();
    }

    this._orderStatus = newStatus;
    this._touch();
  }

  updatePaymentStatus(newStatus: PaymentStatus): void {
    if (this._orderStatus === OrderStatus.CANCELLED) {
      throw new Error('Cannot update payment status of a cancelled order');
    }
    this._paymentStatus = newStatus;
    this._touch();
  }

  setPaymentIntent(paymentIntentId: string): void {
    if (!paymentIntentId || paymentIntentId.trim().length === 0) {
      throw new Error('Payment intent ID cannot be empty');
    }
    this._paymentIntentId = paymentIntentId;
    this._touch();
  }

  markPaymentSucceeded(paymentIntentId: string): void {
    if (this._paymentStatus !== PaymentStatus.PENDING) {
      throw new Error('Payment is not in pending state');
    }
    this._paymentStatus = PaymentStatus.SUCCEEDED;
    this._paymentIntentId = paymentIntentId;
    this._touch();
  }

  markAsPaid(): void {
    if (this._orderStatus === OrderStatus.CANCELLED) {
      throw new Error('Cannot mark a cancelled order as paid');
    }
    if (this._paymentStatus === PaymentStatus.SUCCEEDED) {
      return;
    }
    this._paymentStatus = PaymentStatus.SUCCEEDED;
    this._touch();
  }

  ship(): void {
    if (this._orderStatus === OrderStatus.CANCELLED) {
      throw new Error('Cannot ship a cancelled order');
    }
    if (
      this._orderStatus === OrderStatus.SHIPPED ||
      this._orderStatus === OrderStatus.DELIVERED
    ) {
      throw new Error('Order already shipped or delivered');
    }
    if (this._paymentStatus !== PaymentStatus.SUCCEEDED) {
      throw new Error('Order must be paid before shipping');
    }
    this.updateOrderStatus(OrderStatus.SHIPPED);
  }

  deliver(): void {
    if (this._orderStatus === OrderStatus.CANCELLED) {
      throw new Error('Cannot deliver a cancelled order');
    }
    if (this._orderStatus !== OrderStatus.SHIPPED) {
      throw new Error('Order must be shipped before it can be delivered');
    }
    this.updateOrderStatus(OrderStatus.DELIVERED);
  }

  cancel(reason?: string): void {
    if (this._orderStatus === OrderStatus.CANCELLED) {
      return; // already cancelled
    }
    if (this._orderStatus === OrderStatus.DELIVERED) {
      throw new Error('Cannot cancel a delivered order');
    }
    if (this._orderStatus === OrderStatus.SHIPPED) {
      throw new Error('Cannot cancel an order that has already been shipped');
    }
    this.updateOrderStatus(OrderStatus.CANCELLED);
    if (reason) {
      this._notes = this._notes
        ? `${this._notes}\nCancellation reason: ${reason}`
        : `Cancellation reason: ${reason}`;
    }
  }

  updateShippingAddress(newAddress: Address): void {
    if (
      this._orderStatus === OrderStatus.SHIPPED ||
      this._orderStatus === OrderStatus.DELIVERED
    ) {
      throw new Error('Cannot update shipping address after order has shipped');
    }
    if (this._orderStatus === OrderStatus.CANCELLED) {
      throw new Error('Cannot update a cancelled order');
    }
    this.shippingAddress = newAddress;
    this._touch();
  }

  addNote(note: string): void {
    if (!note || note.trim().length === 0) {
      throw new Error('Note cannot be empty');
    }
    this._notes = this._notes ? `${this._notes}\n${note}` : note;
    this._touch();
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }
}
