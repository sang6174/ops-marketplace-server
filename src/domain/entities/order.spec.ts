import { describe, it, expect, beforeEach } from '@jest/globals';
import { Order, OrderItem } from './order';
import { Address, Country, AdministrativeDivision } from './value-objects/address';
import { OrderStatus, OrderType, PaymentStatus } from './enums.enum';

describe('OrderItem Domain Value Object', () => {
  describe('creation', () => {
    it('should create order item with valid input', () => {
      const item = new OrderItem('shop-1', 'product-1', 'Tomatoes', 10, 50000, 40000);

      expect(item.shopId).toBe('shop-1');
      expect(item.productId).toBe('product-1');
      expect(item.quantity).toBe(10);
      expect(item.retailPrice).toBe(50000);
      expect(item.wholesalePrice).toBe(40000);
    });

    it('should allow wholesale price to be undefined', () => {
      const item = new OrderItem('shop-1', 'product-1', 'Tomatoes', 10, 50000);

      expect(item.wholesalePrice).toBeUndefined();
    });
  });

  describe('getTotalPrice', () => {
    it('should use wholesale price when available', () => {
      const item = new OrderItem('shop-1', 'product-1', 'Tomatoes', 10, 50000, 40000);

      expect(item.getTotalPrice()).toBe(400000); // 40000 * 10
    });

    it('should use retail price when wholesale not available', () => {
      const item = new OrderItem('shop-1', 'product-1', 'Tomatoes', 10, 50000);

      expect(item.getTotalPrice()).toBe(500000); // 50000 * 10
    });
  });

  describe('changeQuantity', () => {
    let item: OrderItem;

    beforeEach(() => {
      item = new OrderItem('shop-1', 'product-1', 'Tomatoes', 10, 50000);
    });

    it('should update quantity', () => {
      item.changeQuantity(20);
      expect(item.quantity).toBe(20);
    });

    it('should throw error on zero quantity', () => {
      expect(() => item.changeQuantity(0)).toThrow(
        'Quantity must be greater than 0',
      );
    });

    it('should throw error on negative quantity', () => {
      expect(() => item.changeQuantity(-5)).toThrow(
        'Quantity must be greater than 0',
      );
    });
  });

  describe('getEffectivePrice', () => {
    it('should return wholesale price when available', () => {
      const item = new OrderItem('shop-1', 'product-1', 'Tomatoes', 10, 50000, 40000);

      expect(item.getEffectivePrice()).toBe(40000);
    });

    it('should return retail price when wholesale not available', () => {
      const item = new OrderItem('shop-1', 'product-1', 'Tomatoes', 10, 50000);

      expect(item.getEffectivePrice()).toBe(50000);
    });
  });
});

describe('Order Domain Entity', () => {
  let testCountry: Country;
  let testProvince: AdministrativeDivision;
  let testAddress: Address;

  beforeEach(() => {
    testCountry = new Country('VN', 'Vietnam');
    testProvince = new AdministrativeDivision(
      testCountry,
      2,
      'HCM',
      'Ho Chi Minh',
    );
    testAddress = new Address(
      testCountry,
      testProvince,
      null,
      null,
      '123 Main St',
      '70000',
    );
  });

  describe('Order.create', () => {
    const validInput = {
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      orderType: OrderType.RETAIL,
      subTotal: 500000,
      shippingFee: 50000,
      items: [
        {
          shopId: 'shop-1',
          productId: 'product-1',
          productName: 'Tomatoes',
          quantity: 10,
          unitPrice: 50000,
        },
      ],
      shippingAddress: testAddress,
      paymentMethod: 'CARD',
    };

    it('should create order with valid input', () => {
      const order = Order.create(validInput);

      expect(order.buyerId).toBe('buyer-1');
      expect(order.sellerId).toBe('seller-1');
      expect(order.orderType).toBe(OrderType.RETAIL);
      expect(order.subtotal).toBe(500000);
      expect(order.shippingFee).toBe(50000);
      expect(order.grandTotal).toBe(550000);
      expect(order.orderStatus).toBe(OrderStatus.PENDING);
      expect(order.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(order.items).toHaveLength(1);
    });

    it('should throw error on empty items', () => {
      expect(() =>
        Order.create({
          ...validInput,
          items: [],
        }),
      ).toThrow('Order must contain at least one item');
    });

    it('should accept multiple order items', () => {
      const order = Order.create({
        ...validInput,
        items: [
          {
            shopId: 'shop-1',
            productId: 'product-1',
            productName: 'Tomatoes',
            quantity: 10,
            unitPrice: 50000,
          },
          {
            shopId: 'shop-1',
            productId: 'product-2',
            productName: 'Lettuce',
            quantity: 5,
            unitPrice: 30000,
          },
        ],
      });

      expect(order.items).toHaveLength(2);
    });

    it('should calculate grand total correctly', () => {
      const order = Order.create({
        ...validInput,
        subTotal: 1000000,
        shippingFee: 100000,
      });

      expect(order.grandTotal).toBe(1100000);
    });

    it('should accept notes', () => {
      const order = Order.create({
        ...validInput,
        notes: 'Please deliver on Tuesday',
      });

      expect(order.notes).toBe('Please deliver on Tuesday');
    });
  });
  });

  describe('updateOrderStatus', () => {
    let order: Order;

    beforeEach(() => {
      order = Order.create({
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        orderType: OrderType.RETAIL,
        subTotal: 500000,
        shippingFee: 50000,
        items: [
          {
            shopId: 'shop-1',
            productId: 'product-1',
            productName: 'Tomatoes',
            quantity: 10,
            unitPrice: 50000,
          },
        ],
        shippingAddress: testAddress,
        paymentMethod: 'CARD',
      });

      // Mark payment as succeeded
      order.updatePaymentStatus(PaymentStatus.SUCCEEDED);
    });

    it('should update order status', () => {
      order.updateOrderStatus(OrderStatus.CONFIRMED);
      expect(order.orderStatus).toBe(OrderStatus.CONFIRMED);
    });

    it('should not change status if same', () => {
      order.updateOrderStatus(OrderStatus.PENDING);
      expect(order.orderStatus).toBe(OrderStatus.PENDING);
    });

    it('should throw error on cancelled order status change', () => {
      order.updateOrderStatus(OrderStatus.CANCELLED);

      expect(() => order.updateOrderStatus(OrderStatus.CONFIRMED)).toThrow(
        'Cannot update a cancelled order',
      );
    });

    it('should throw error on delivered order status change', () => {
      order.updateOrderStatus(OrderStatus.SHIPPED);
      order.updateOrderStatus(OrderStatus.DELIVERED);

      expect(() => order.updateOrderStatus(OrderStatus.CONFIRMED)).toThrow(
        'Cannot update a delivered order',
      );
    });

    it('should throw error on refunded order status change', () => {
      // Once delivered, we can't update the order status
      order.updateOrderStatus(OrderStatus.SHIPPED);
      order.updateOrderStatus(OrderStatus.DELIVERED);

      expect(() => order.updateOrderStatus(OrderStatus.CONFIRMED)).toThrow(
        'Cannot update a delivered order',
      );
    });

    it('should set shippedAt when transitioning to SHIPPED', () => {
      order.updateOrderStatus(OrderStatus.SHIPPED);

      expect(order.shippedAt).toBeDefined();
      expect(order.shippedAt).toBeInstanceOf(Date);
    });

    it('should set deliveredAt when transitioning to DELIVERED', () => {
      order.updateOrderStatus(OrderStatus.SHIPPED);
      order.updateOrderStatus(OrderStatus.DELIVERED);

      expect(order.deliveredAt).toBeDefined();
      expect(order.deliveredAt).toBeInstanceOf(Date);
    });

    it('should throw error shipping without payment succeeded', () => {
      const newOrder = Order.create({
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        orderType: OrderType.RETAIL,
        subTotal: 500000,
        shippingFee: 50000,
        items: [
          {
            shopId: 'shop-1',
            productId: 'product-1',
            productName: 'Tomatoes',
            quantity: 10,
            unitPrice: 50000,
          },
        ],
        shippingAddress: testAddress,
        paymentMethod: 'CARD',
      });

      expect(() => newOrder.updateOrderStatus(OrderStatus.SHIPPED)).toThrow(
        'Cannot ship order with pending or failed payment',
      );
    });

    it('should throw error delivering without payment succeeded', () => {
      const newOrder = Order.create({
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        orderType: OrderType.RETAIL,
        subTotal: 500000,
        shippingFee: 50000,
        items: [
          {
            shopId: 'shop-1',
            productId: 'product-1',
            productName: 'Tomatoes',
            quantity: 10,
            unitPrice: 50000,
          },
        ],
        shippingAddress: testAddress,
        paymentMethod: 'CARD',
      });

      newOrder.updateOrderStatus(OrderStatus.PROCESSING);

      expect(() => newOrder.updateOrderStatus(OrderStatus.DELIVERED)).toThrow(
        'Cannot deliver order with pending or failed payment',
      );
    });

    it('should throw error cancelling shipped order', () => {
      order.updateOrderStatus(OrderStatus.SHIPPED);

      expect(() => order.updateOrderStatus(OrderStatus.CANCELLED)).toThrow(
        'Cannot cancel an order that has already been shipped or delivered',
      );
    });

    it('should allow cancelling pending order', () => {
      const newOrder = Order.create({
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        orderType: OrderType.RETAIL,
        subTotal: 500000,
        shippingFee: 50000,
        items: [
          {
            shopId: 'shop-1',
            productId: 'product-1',
            productName: 'Tomatoes',
            quantity: 10,
            unitPrice: 50000,
          },
        ],
        shippingAddress: testAddress,
        paymentMethod: 'CARD',
      });

      expect(() =>
        newOrder.updateOrderStatus(OrderStatus.CANCELLED),
      ).not.toThrow();
      expect(newOrder.cancelledAt).toBeDefined();
    });

    it('should set cancelledAt when transitioning to CANCELLED', () => {
      expect(() =>
        order.updateOrderStatus(OrderStatus.CANCELLED),
      ).not.toThrow();

      expect(order.cancelledAt).toBeDefined();
      expect(order.cancelledAt).toBeInstanceOf(Date);
    });
  });

  describe('canBeCancelled', () => {
    let order: Order;

    beforeEach(() => {
      order = Order.create({
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        orderType: OrderType.RETAIL,
        subTotal: 500000,
        shippingFee: 50000,
        items: [
          {
            shopId: 'shop-1',
            productId: 'product-1',
            productName: 'Tomatoes',
            quantity: 10,
            unitPrice: 50000,
          },
        ],
        shippingAddress: testAddress,
        paymentMethod: 'CARD',
      });
    });

    it('should return true for PENDING orders', () => {
      expect(order.canBeCancelled()).toBe(true);
    });

    it('should return true for CONFIRMED orders', () => {
      order.updateOrderStatus(OrderStatus.CONFIRMED);
      expect(order.canBeCancelled()).toBe(true);
    });

    it('should return false for PROCESSING orders', () => {
      order.updateOrderStatus(OrderStatus.CONFIRMED);
      order.updateOrderStatus(OrderStatus.PROCESSING);
      expect(order.canBeCancelled()).toBe(false);
    });

    it('should return false for SHIPPED orders', () => {
      order.updatePaymentStatus(PaymentStatus.SUCCEEDED);
      order.updateOrderStatus(OrderStatus.SHIPPED);
      expect(order.canBeCancelled()).toBe(false);
    });

    it('should return false for DELIVERED orders', () => {
      order.updatePaymentStatus(PaymentStatus.SUCCEEDED);
      order.updateOrderStatus(OrderStatus.SHIPPED);
      order.updateOrderStatus(OrderStatus.DELIVERED);
      expect(order.canBeCancelled()).toBe(false);
    });

    it('should return false for CANCELLED orders', () => {
      order.updateOrderStatus(OrderStatus.CANCELLED);
      expect(order.canBeCancelled()).toBe(false);
    });

    it('should return false for REFUNDED orders', () => {
      order.markPaymentSucceeded('pi_123');
      order.updatePaymentStatus(PaymentStatus.SUCCEEDED);
      order.updateOrderStatus(OrderStatus.DELIVERED);
      expect(order.canBeCancelled()).toBe(false);
    });
  });

  describe('updatePaymentStatus', () => {
    let order: Order;

    beforeEach(() => {
      order = Order.create({
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        orderType: OrderType.RETAIL,
        subTotal: 500000,
        shippingFee: 50000,
        items: [
          {
            shopId: 'shop-1',
            productId: 'product-1',
            productName: 'Tomatoes',
            quantity: 10,
            unitPrice: 50000,
          },
        ],
        shippingAddress: testAddress,
        paymentMethod: 'CARD',
      });
    });

    it('should update payment status', () => {
      order.updatePaymentStatus(PaymentStatus.SUCCEEDED);
      expect(order.paymentStatus).toBe(PaymentStatus.SUCCEEDED);
    });

    it('should throw error on cancelled order', () => {
      order.updateOrderStatus(OrderStatus.CANCELLED);

      expect(() => order.updatePaymentStatus(PaymentStatus.SUCCEEDED)).toThrow(
        'Cannot update payment status of a cancelled order',
      );
    });
  });

  describe('setPaymentIntent', () => {
    let order: Order;

    beforeEach(() => {
      order = Order.create({
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        orderType: OrderType.RETAIL,
        subTotal: 500000,
        shippingFee: 50000,
        items: [
          {
            shopId: 'shop-1',
            productId: 'product-1',
            productName: 'Tomatoes',
            quantity: 10,
            unitPrice: 50000,
          },
        ],
        shippingAddress: testAddress,
        paymentMethod: 'CARD',
      });
    });

    it('should set payment intent ID', () => {
      order.setPaymentIntent('pi_12345678');

      expect(order.paymentIntentId).toBe('pi_12345678');
    });

    it('should throw error on empty payment intent', () => {
      expect(() => order.setPaymentIntent('')).toThrow(
        'Payment intent ID cannot be empty',
      );
    });

    it('should throw error on null payment intent', () => {
      expect(() => order.setPaymentIntent(null as any)).toThrow(
        'Payment intent ID cannot be empty',
      );
    });
  });

  describe('getters', () => {
    let order: Order;

    beforeEach(() => {
      order = Order.create({
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        orderType: OrderType.RETAIL,
        subTotal: 500000,
        shippingFee: 50000,
        items: [
          {
            shopId: 'shop-1',
            productId: 'product-1',
            productName: 'Tomatoes',
            quantity: 10,
            unitPrice: 50000,
          },
        ],
        shippingAddress: testAddress,
        paymentMethod: 'CARD',
        notes: 'Test notes',
      });
    });

    it('should return items', () => {
      expect(order.items).toHaveLength(1);
      expect(order.items[0].productId).toBe('product-1');
    });

    it('should return subtotal', () => {
      expect(order.subtotal).toBe(500000);
    });

    it('should return shippingFee', () => {
      expect(order.shippingFee).toBe(50000);
    });

    it('should return grandTotal', () => {
      expect(order.grandTotal).toBe(550000);
    });

    it('should return paymentStatus', () => {
      expect(order.paymentStatus).toBe(PaymentStatus.PENDING);
    });

    it('should return orderStatus', () => {
      expect(order.orderStatus).toBe(OrderStatus.PENDING);
    });

    it('should return shippingAddress', () => {
      expect(order.shippingAddress).toEqual(testAddress);
    });

    it('should return paymentMethod', () => {
      expect(order.paymentMethod).toBe('CARD');
    });

    it('should return notes', () => {
      expect(order.notes).toBe('Test notes');
    });

    it('should return updatedAt', () => {
      expect(order.updatedAt).toBeInstanceOf(Date);
    });

    it('should return createdAt', () => {
      expect(order.createdAt).toBeInstanceOf(Date);
    });

    it('should return id', () => {
      expect(order.id).toBeDefined();
      expect(typeof order.id).toBe('string');
    });
  });

  describe('items immutability', () => {
    let order: Order;

    beforeEach(() => {
      order = Order.create({
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        orderType: OrderType.RETAIL,
        subTotal: 500000,
        shippingFee: 50000,
        items: [
          {
            shopId: 'shop-1',
            productId: 'product-1',
            productName: 'Tomatoes',
            quantity: 10,
            unitPrice: 50000,
          },
        ],
        shippingAddress: testAddress,
        paymentMethod: 'CARD',
      });
    });

    it('should return copy of items array', () => {
      const items1 = order.items;
      const items2 = order.items;

      expect(items1).not.toBe(items2);
      expect(items1).toEqual(items2);
    });
  });
});
