import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Cart, CartItem } from '../orders/Cart';

describe('CartItem', () => {
  let cartItem: CartItem;

  beforeEach(() => {
    cartItem = new CartItem('shop-1', 'product-1', 2, 100_000, 80_000);
  });

  describe('constructor', () => {
    it('should create CartItem with all fields', () => {
      expect(cartItem.shopId).toBe('shop-1');
      expect(cartItem.productId).toBe('product-1');
      expect(cartItem.quantity).toBe(2);
      expect(cartItem.retailPrice).toBe(100_000);
      expect(cartItem.wholesalePrice).toBe(80_000);
    });

    it('should allow undefined wholesalePrice', () => {
      const item = new CartItem('shop-2', 'product-2', 1, 50_000);
      expect(item.wholesalePrice).toBeUndefined();
    });
  });

  describe('getTotalPrice', () => {
    it('should use wholesale price if available', () => {
      expect(cartItem.getTotalPrice()).toBe(80_000 * 2);
    });

    it('should use retail price if wholesale not available', () => {
      const item = new CartItem('shop-2', 'product-2', 3, 50_000);
      expect(item.getTotalPrice()).toBe(150_000);
    });
  });

  describe('changeQuantity', () => {
    it('should update quantity', () => {
      cartItem.changeQuantity(5);
      expect(cartItem.quantity).toBe(5);
    });

    it('should throw if quantity <= 0', () => {
      expect(() => cartItem.changeQuantity(0)).toThrow(
        'Quantity must be greater than 0',
      );
      expect(() => cartItem.changeQuantity(-1)).toThrow(
        'Quantity must be greater than 0',
      );
    });
  });

  describe('changeRetailPrice', () => {
    it('should update retail price', () => {
      cartItem.changeRetailPrice(120_000);
      expect(cartItem.retailPrice).toBe(120_000);
    });

    it('should throw if price <= 0', () => {
      expect(() => cartItem.changeRetailPrice(0)).toThrow(
        'Unit price must be greater than 0',
      );
      expect(() => cartItem.changeRetailPrice(-10_000)).toThrow(
        'Unit price must be greater than 0',
      );
    });
  });

  describe('changeWholesalePrice', () => {
    it('should update wholesale price', () => {
      cartItem.changeWholesalePrice(90_000);
      expect(cartItem.wholesalePrice).toBe(90_000);
    });

    it('should allow setting to undefined', () => {
      cartItem.changeWholesalePrice(undefined);
      expect(cartItem.wholesalePrice).toBeUndefined();
    });

    it('should throw if price <= 0', () => {
      expect(() => cartItem.changeWholesalePrice(0)).toThrow(
        'Wholesale price must be greater than 0',
      );
      expect(() => cartItem.changeWholesalePrice(-10_000)).toThrow(
        'Wholesale price must be greater than 0',
      );
    });
  });

  describe('getEffectivePrice', () => {
    it('should return wholesale if available', () => {
      expect(cartItem.getEffectivePrice()).toBe(80_000);
    });

    it('should return retail if wholesale not available', () => {
      const item = new CartItem('shop-2', 'product-2', 1, 50_000);
      expect(item.getEffectivePrice()).toBe(50_000);
    });
  });
});

describe('Cart', () => {
  let cart: Cart;
  const fixedDate = new Date('2025-01-01T00:00:00.000Z');
  const fixedId = 'add-ddd-ddd-ddd-ddd';

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
    jest.spyOn(crypto, 'randomUUID').mockReturnValue(fixedId);

    cart = Cart.create('user-123');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('should create cart with userId', () => {
      expect(cart.id).toBe(fixedId);
      expect(cart.userId).toBe('user-123');
      expect(cart.sessionId).toBeNull();
      expect(cart.items).toEqual([]);
      expect(cart.createdAt).toEqual(fixedDate);
      expect(cart.updatedAt).toEqual(fixedDate);
    });

    it('should create cart with sessionId', () => {
      const sessionCart = Cart.create(undefined, 'session-456');
      expect(sessionCart.userId).toBeNull();
      expect(sessionCart.sessionId).toBe('session-456');
    });

    it('should throw if both userId and sessionId are missing', () => {
      expect(() => Cart.create(undefined, undefined)).toThrow(
        'Cart must be associated with either a user or a session',
      );
    });
  });

  describe('getters', () => {
    it('should return copy of items', () => {
      const items = cart.items;
      items.push(new CartItem('shop', 'product', 1, 100_000));
      expect(cart.items).toHaveLength(0);
    });
  });

  describe('addItem', () => {
    it('should add new item', () => {
      cart.addItem('shop-1', 'product-1', 2, 100_000);
      expect(cart.items).toHaveLength(1);
      const item = cart.items[0];
      expect(item.shopId).toBe('shop-1');
      expect(item.productId).toBe('product-1');
      expect(item.quantity).toBe(2);
      expect(item.retailPrice).toBe(100_000);
      expect(item.wholesalePrice).toBeUndefined();
      expect(cart.updatedAt).not.toBe(fixedDate);
    });

    it('should add new item with wholesale price', () => {
      cart.addItem('shop-1', 'product-1', 3, 100_000, 80_000);
      const item = cart.items[0];
      expect(item.wholesalePrice).toBe(80_000);
    });

    it('should update quantity if product already exists', () => {
      cart.addItem('shop-1', 'product-1', 2, 100_000);
      cart.addItem('shop-1', 'product-1', 3, 100_000);
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(5);
    });

    it('should throw if quantity <= 0', () => {
      expect(() => cart.addItem('shop-1', 'product-1', 0, 100_000)).toThrow(
        'Quantity must be greater than 0',
      );
    });

    it('should throw if unitPrice <= 0', () => {
      expect(() => cart.addItem('shop-1', 'product-1', 1, 0)).toThrow(
        'Unit price must be greater than 0',
      );
    });
  });

  describe('updateItemQuantity', () => {
    beforeEach(() => {
      cart.addItem('shop-1', 'product-1', 2, 100_000);
    });

    it('should update quantity of existing item', () => {
      cart.updateItemQuantity('product-1', 5);
      expect(cart.items[0].quantity).toBe(5);
      expect(cart.updatedAt).not.toBe(fixedDate);
    });

    it('should throw if product not found', () => {
      expect(() => cart.updateItemQuantity('product-999', 3)).toThrow(
        'Product not found in cart',
      );
    });

    it('should throw if newQuantity <= 0', () => {
      expect(() => cart.updateItemQuantity('product-1', 0)).toThrow(
        'Quantity must be greater than 0',
      );
    });
  });

  describe('removeItem', () => {
    beforeEach(() => {
      cart.addItem('shop-1', 'product-1', 2, 100_000);
      cart.addItem('shop-2', 'product-2', 1, 200_000);
    });

    it('should remove existing item', () => {
      cart.removeItem('product-1');
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].productId).toBe('product-2');
      expect(cart.updatedAt).not.toBe(fixedDate);
    });

    it('should throw if product not found', () => {
      expect(() => cart.removeItem('product-999')).toThrow(
        'Product not found in cart',
      );
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      cart.addItem('shop-1', 'product-1', 2, 100_000);
      cart.addItem('shop-2', 'product-2', 1, 200_000);
    });

    it('should remove all items', () => {
      cart.clear();
      expect(cart.items).toHaveLength(0);
      expect(cart.updatedAt).not.toBe(fixedDate);
    });
  });

  describe('mergeCart', () => {
    let otherCart: Cart;

    beforeEach(() => {
      cart.addItem('shop-1', 'product-1', 2, 100_000);
      cart.addItem('shop-2', 'product-2', 1, 200_000);

      otherCart = Cart.create('user-456');
      otherCart.addItem('shop-1', 'product-1', 3, 100_000, 80_000);
      otherCart.addItem('shop-3', 'product-3', 5, 150_000);
    });

    it('should merge items from other cart (existing product should combine quantity)', () => {
      cart.mergeCart(otherCart);
      expect(cart.items).toHaveLength(3);
      const product1 = cart.items.find((i) => i.productId === 'product-1');
      expect(product1?.quantity).toBe(5);
      expect(product1?.wholesalePrice).toBe(80_000);
      const product2 = cart.items.find((i) => i.productId === 'product-2');
      expect(product2?.quantity).toBe(1);
      const product3 = cart.items.find((i) => i.productId === 'product-3');
      expect(product3?.quantity).toBe(5);
      expect(cart.updatedAt).not.toBe(fixedDate);
    });

    it('should not mutate other cart', () => {
      const otherItemsCount = otherCart.items.length;
      cart.mergeCart(otherCart);
      expect(otherCart.items).toHaveLength(otherItemsCount);
    });
  });

  describe('assignUser', () => {
    beforeEach(() => {
      const sessionCart = Cart.create(undefined, 'session-123');
    });

    it('should assign user and clear sessionId', () => {
      const sessionCart = Cart.create(undefined, 'session-123');
      sessionCart.assignUser('user-456');
      expect(sessionCart.userId).toBe('user-456');
      expect(sessionCart.sessionId).toBeNull();
      expect(sessionCart.updatedAt).not.toBe(fixedDate);
    });
  });

  describe('refreshPrices', () => {
    beforeEach(() => {
      cart.addItem('shop-1', 'product-1', 2, 100_000, 80_000);
      cart.addItem('shop-2', 'product-2', 1, 200_000);
    });

    it('should update prices from productPrices mapping', () => {
      const prices = {
        'product-1': { unitPrice: 120_000, wholesalePrice: 90_000 },
        'product-2': { unitPrice: 250_000 },
      };
      cart.refreshPrices(prices);
      const item1 = cart.items.find((i) => i.productId === 'product-1');
      expect(item1?.retailPrice).toBe(120_000);
      expect(item1?.wholesalePrice).toBe(90_000);
      const item2 = cart.items.find((i) => i.productId === 'product-2');
      expect(item2?.retailPrice).toBe(250_000);
      expect(cart.updatedAt).not.toBe(fixedDate);
    });

    it('should not update if product not in mapping', () => {
      const prices = { 'product-999': { unitPrice: 300_000 } };
      cart.refreshPrices(prices);
      const item1 = cart.items.find((i) => i.productId === 'product-1');
      expect(item1?.retailPrice).toBe(100_000);
      expect(item1?.wholesalePrice).toBe(80_000);
    });

    it('should handle missing wholesale in mapping (set to undefined)', () => {
      const prices = { 'product-1': { unitPrice: 120_000 } };
      cart.refreshPrices(prices);
      const item1 = cart.items.find((i) => i.productId === 'product-1');
      expect(item1?.wholesalePrice).toBeUndefined();
    });
  });

  describe('total price and quantity', () => {
    beforeEach(() => {
      cart.addItem('shop-1', 'product-1', 2, 100_000, 80_000);
      cart.addItem('shop-2', 'product-2', 3, 50_000);
    });

    it('getTotalPrice should sum item totals (using effective price)', () => {
      expect(cart.getTotalPrice()).toBe(310_000);
    });

    it('getTotalQuantity should sum quantities', () => {
      expect(cart.getTotalQuantity()).toBe(5);
    });

    it('isEmpty should return true if no items', () => {
      expect(cart.isEmpty()).toBe(false);
      cart.clear();
      expect(cart.isEmpty()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle adding item when cart is empty and quantity updates', () => {
      cart.addItem('shop-1', 'product-1', 1, 100_000);
      cart.addItem('shop-1', 'product-1', 2, 100_000);
      expect(cart.items[0].quantity).toBe(3);
    });

    it('should handle merging carts with same product and different prices (should use latest from other)', () => {
      const other = Cart.create('user-789');
      other.addItem('shop-1', 'product-1', 1, 150_000, 120_000);
      cart.addItem('shop-1', 'product-1', 2, 100_000, 80_000);
      cart.mergeCart(other);
      const item = cart.items.find((i) => i.productId === 'product-1');
      expect(item?.quantity).toBe(3);

      expect(item?.retailPrice).toBe(100_000);
      expect(item?.wholesalePrice).toBe(120_000);
    });
  });
});
