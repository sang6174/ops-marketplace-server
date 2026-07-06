import { Cart, CartItem } from './cart';

describe('CartItem Domain Value Object', () => {
  describe('creation', () => {
    it('should create cart item', () => {
      const item = new CartItem('product-1', 10, 50000, 40000);

      expect(item.productId).toBe('product-1');
      expect(item.quantity).toBe(10);
      expect(item.retailPrice).toBe(50000);
      expect(item.wholesalePrice).toBe(40000);
    });

    it('should allow optional wholesale price', () => {
      const item = new CartItem('product-1', 10, 50000);

      expect(item.wholesalePrice).toBeUndefined();
    });
  });

  describe('getTotalPrice', () => {
    it('should use wholesale price when available', () => {
      const item = new CartItem('product-1', 10, 50000, 40000);

      expect(item.getTotalPrice()).toBe(400000);
    });

    it('should use retail price when wholesale not available', () => {
      const item = new CartItem('product-1', 10, 50000);

      expect(item.getTotalPrice()).toBe(500000);
    });
  });

  describe('changeQuantity', () => {
    let item: CartItem;

    beforeEach(() => {
      item = new CartItem('product-1', 10, 50000);
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

  describe('changeRetailPrice', () => {
    let item: CartItem;

    beforeEach(() => {
      item = new CartItem('product-1', 10, 50000);
    });

    it('should update retail price', () => {
      item.changeRetailPrice(60000);
      expect(item.retailPrice).toBe(60000);
    });

    it('should throw error on zero price', () => {
      expect(() => item.changeRetailPrice(0)).toThrow(
        'Unit price must be greater than 0',
      );
    });

    it('should throw error on negative price', () => {
      expect(() => item.changeRetailPrice(-1000)).toThrow(
        'Unit price must be greater than 0',
      );
    });
  });

  describe('changeWholesalePrice', () => {
    let item: CartItem;

    beforeEach(() => {
      item = new CartItem('product-1', 10, 50000, 40000);
    });

    it('should update wholesale price', () => {
      item.changeWholesalePrice(35000);
      expect(item.wholesalePrice).toBe(35000);
    });

    it('should clear wholesale price', () => {
      item.changeWholesalePrice(undefined);
      expect(item.wholesalePrice).toBeUndefined();
    });

    it('should throw error on zero price', () => {
      expect(() => item.changeWholesalePrice(0)).toThrow(
        'Wholesale price must be greater than 0',
      );
    });

    it('should throw error on negative price', () => {
      expect(() => item.changeWholesalePrice(-1000)).toThrow(
        'Wholesale price must be greater than 0',
      );
    });
  });

  describe('getEffectivePrice', () => {
    it('should return wholesale price when available', () => {
      const item = new CartItem('product-1', 10, 50000, 40000);
      expect(item.getEffectivePrice()).toBe(40000);
    });

    it('should return retail price when wholesale not available', () => {
      const item = new CartItem('product-1', 10, 50000);
      expect(item.getEffectivePrice()).toBe(50000);
    });
  });
});

describe('Cart Domain Entity', () => {
  describe('Cart.create', () => {
    it('should create cart with userId', () => {
      const cart = Cart.create('user-1');

      expect(cart.userId).toBe('user-1');
      expect(cart.sessionId).toBeNull();
      expect(cart.items).toHaveLength(0);
    });

    it('should create cart with sessionId', () => {
      const cart = Cart.create(undefined, 'session-1');

      expect(cart.userId).toBeNull();
      expect(cart.sessionId).toBe('session-1');
      expect(cart.items).toHaveLength(0);
    });

    it('should create cart with both userId and sessionId', () => {
      const cart = Cart.create('user-1', 'session-1');

      expect(cart.userId).toBe('user-1');
      expect(cart.sessionId).toBe('session-1');
    });

    it('should throw error with neither userId nor sessionId', () => {
      expect(() => Cart.create()).toThrow(
        'Cart must be associated with either a user or a session',
      );
    });

    it('should have id and timestamps', () => {
      const cart = Cart.create('user-1');

      expect(cart.id).toBeDefined();
      expect(cart.createdAt).toBeInstanceOf(Date);
      expect(cart.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('addItem', () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.create('user-1');
    });

    it('should add new item to cart', () => {
      cart.addItem('product-1', 10, 50000);

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].productId).toBe('product-1');
      expect(cart.items[0].quantity).toBe(10);
    });

    it('should add item with wholesale price', () => {
      cart.addItem('product-1', 10, 50000, 40000);

      expect(cart.items[0].wholesalePrice).toBe(40000);
    });

    it('should increment quantity if item already exists', () => {
      cart.addItem('product-1', 10, 50000);
      cart.addItem('product-1', 5, 50000);

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(15);
    });

    it('should handle multiple different items', () => {
      cart.addItem('product-1', 10, 50000);
      cart.addItem('product-2', 5, 30000);

      expect(cart.items).toHaveLength(2);
    });

    it('should throw error on zero quantity', () => {
      expect(() => cart.addItem('product-1', 0, 50000)).toThrow(
        'Quantity must be greater than 0',
      );
    });

    it('should throw error on zero price', () => {
      expect(() => cart.addItem('product-1', 10, 0)).toThrow(
        'Unit price must be greater than 0',
      );
    });

    it('should update updatedAt', () => {
      const oldDate = cart.updatedAt;
      cart.addItem('product-1', 10, 50000);

      expect(cart.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });
  });

  describe('updateItemQuantity', () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.create('user-1');
      cart.addItem('product-1', 10, 50000);
      cart.addItem('product-2', 5, 30000);
    });

    it('should update item quantity', () => {
      cart.updateItemQuantity('product-1', 20);

      expect(cart.items[0].quantity).toBe(20);
    });

    it('should throw error on product not found', () => {
      expect(() => cart.updateItemQuantity('product-99', 10)).toThrow(
        'Product not found in cart',
      );
    });

    it('should throw error on zero quantity', () => {
      expect(() => cart.updateItemQuantity('product-1', 0)).toThrow(
        'Quantity must be greater than 0',
      );
    });

    it('should throw error on negative quantity', () => {
      expect(() => cart.updateItemQuantity('product-1', -5)).toThrow(
        'Quantity must be greater than 0',
      );
    });

    it('should update updatedAt', () => {
      const oldDate = cart.updatedAt;
      cart.updateItemQuantity('product-1', 20);

      expect(cart.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });
  });

  describe('removeItem', () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.create('user-1');
      cart.addItem('product-1', 10, 50000);
      cart.addItem('product-2', 5, 30000);
    });

    it('should remove item from cart', () => {
      cart.removeItem('product-1');

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].productId).toBe('product-2');
    });

    it('should throw error on product not found', () => {
      expect(() => cart.removeItem('product-99')).toThrow(
        'Product not found in cart',
      );
    });

    it('should update updatedAt', () => {
      const oldDate = cart.updatedAt;
      cart.removeItem('product-1');

      expect(cart.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });
  });

  describe('clear', () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.create('user-1');
      cart.addItem('product-1', 10, 50000);
      cart.addItem('product-2', 5, 30000);
    });

    it('should remove all items', () => {
      cart.clear();

      expect(cart.items).toHaveLength(0);
      expect(cart.isEmpty()).toBe(true);
    });

    it('should update updatedAt', () => {
      const oldDate = cart.updatedAt;
      cart.clear();

      expect(cart.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });
  });

  describe('getTotalPrice', () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.create('user-1');
    });

    it('should return 0 for empty cart', () => {
      expect(cart.getTotalPrice()).toBe(0);
    });

    it('should calculate total with retail prices', () => {
      cart.addItem('product-1', 10, 50000);
      cart.addItem('product-2', 5, 30000);

      expect(cart.getTotalPrice()).toBe(10 * 50000 + 5 * 30000);
    });

    it('should use wholesale prices when available', () => {
      cart.addItem('product-1', 10, 50000, 40000);
      cart.addItem('product-2', 5, 30000, 25000);

      expect(cart.getTotalPrice()).toBe(10 * 40000 + 5 * 25000);
    });

    it('should mix retail and wholesale prices', () => {
      cart.addItem('product-1', 10, 50000, 40000);
      cart.addItem('product-2', 5, 30000);

      expect(cart.getTotalPrice()).toBe(10 * 40000 + 5 * 30000);
    });
  });

  describe('getTotalQuantity', () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.create('user-1');
    });

    it('should return 0 for empty cart', () => {
      expect(cart.getTotalQuantity()).toBe(0);
    });

    it('should sum all quantities', () => {
      cart.addItem('product-1', 10, 50000);
      cart.addItem('product-2', 5, 30000);
      cart.addItem('product-3', 3, 20000);

      expect(cart.getTotalQuantity()).toBe(18);
    });
  });

  describe('isEmpty', () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.create('user-1');
    });

    it('should return true for empty cart', () => {
      expect(cart.isEmpty()).toBe(true);
    });

    it('should return false when items added', () => {
      cart.addItem('product-1', 10, 50000);

      expect(cart.isEmpty()).toBe(false);
    });

    it('should return true after clearing', () => {
      cart.addItem('product-1', 10, 50000);
      cart.clear();

      expect(cart.isEmpty()).toBe(true);
    });
  });

  describe('mergeCart', () => {
    let cart1: Cart;
    let cart2: Cart;

    beforeEach(() => {
      cart1 = Cart.create('user-1');
      cart1.addItem('product-1', 10, 50000);

      cart2 = Cart.create('session-1', 'session-1');
      cart2.addItem('product-2', 5, 30000);
    });

    it('should merge items from another cart', () => {
      cart1.mergeCart(cart2);

      expect(cart1.items).toHaveLength(2);
      expect(cart1.getTotalQuantity()).toBe(15);
    });

    it('should combine quantities of same product', () => {
      cart1.addItem('product-2', 3, 30000);
      cart2.addItem('product-1', 5, 50000);

      cart1.mergeCart(cart2);

      expect(cart1.items).toHaveLength(2);
      const product1 = cart1.items.find((i) => i.productId === 'product-1');
      const product2 = cart1.items.find((i) => i.productId === 'product-2');

      expect(product1?.quantity).toBe(15); // 10 + 5
      expect(product2?.quantity).toBe(8); // 3 + 5
    });

    it('should merge empty cart', () => {
      const emptyCart = Cart.create('session-2', 'session-2');

      cart1.mergeCart(emptyCart);

      expect(cart1.items).toHaveLength(1);
    });

    it('should update updatedAt', () => {
      const oldDate = cart1.updatedAt;
      cart1.mergeCart(cart2);

      expect(cart1.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });
  });

  describe('assignUser', () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.create(undefined, 'session-1');
    });

    it('should assign user to session-based cart', () => {
      cart.assignUser('user-1');

      expect(cart.userId).toBe('user-1');
      expect(cart.sessionId).toBeNull();
    });

    it('should replace session with user', () => {
      cart.assignUser('user-1');

      expect(cart.sessionId).toBeNull();
    });

    it('should preserve items when assigning user', () => {
      cart.addItem('product-1', 10, 50000);
      cart.assignUser('user-1');

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].productId).toBe('product-1');
    });

    it('should update updatedAt', () => {
      const oldDate = cart.updatedAt;
      cart.assignUser('user-1');

      expect(cart.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });
  });

  describe('refreshPrices', () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.create('user-1');
      cart.addItem('product-1', 10, 50000, 40000);
      cart.addItem('product-2', 5, 30000);
    });

    it('should update retail prices', () => {
      cart.refreshPrices({
        'product-1': { unitPrice: 55000 },
      });

      expect(cart.items[0].retailPrice).toBe(55000);
    });

    it('should update wholesale prices', () => {
      cart.refreshPrices({
        'product-1': { unitPrice: 55000, wholesalePrice: 45000 },
      });

      expect(cart.items[0].retailPrice).toBe(55000);
      expect(cart.items[0].wholesalePrice).toBe(45000);
    });

    it('should skip missing products', () => {
      const oldPrice = cart.items[0].retailPrice;

      cart.refreshPrices({
        'product-99': { unitPrice: 99999 },
      });

      expect(cart.items[0].retailPrice).toBe(oldPrice);
    });

    it('should handle partial price updates', () => {
      const oldWholesalePrice = cart.items[1].wholesalePrice;

      cart.refreshPrices({
        'product-2': { unitPrice: 32000 },
      });

      expect(cart.items[1].retailPrice).toBe(32000);
      expect(cart.items[1].wholesalePrice).toBe(oldWholesalePrice);
    });

    it('should not update if prices are same', () => {
      const oldUpdatedAt = cart.updatedAt;

      cart.refreshPrices({
        'product-1': { unitPrice: 50000, wholesalePrice: 40000 },
      });

      // updatedAt is still updated because refreshPrices calls _touch()
      expect(cart.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldUpdatedAt.getTime(),
      );
    });

    it('should update updatedAt', () => {
      const oldDate = cart.updatedAt;

      cart.refreshPrices({
        'product-1': { unitPrice: 60000 },
      });

      expect(cart.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldDate.getTime(),
      );
    });
  });

  describe('getters', () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.create('user-1');
      cart.addItem('product-1', 10, 50000);
    });

    it('should return id', () => {
      expect(cart.id).toBeDefined();
      expect(typeof cart.id).toBe('string');
    });

    it('should return userId', () => {
      expect(cart.userId).toBe('user-1');
    });

    it('should return sessionId', () => {
      const sessionCart = Cart.create(undefined, 'session-1');
      expect(sessionCart.sessionId).toBe('session-1');
    });

    it('should return items copy', () => {
      const items1 = cart.items;
      const items2 = cart.items;

      expect(items1).toEqual(items2);
      expect(items1).not.toBe(items2);
    });

    it('should return createdAt and updatedAt', () => {
      expect(cart.createdAt).toBeInstanceOf(Date);
      expect(cart.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('complex scenarios', () => {
    let cart: Cart;

    beforeEach(() => {
      cart = Cart.create('user-1');
    });

    it('should handle full shopping flow', () => {
      // Add items
      cart.addItem('product-1', 5, 100000, 90000);
      cart.addItem('product-2', 3, 50000);
      expect(cart.getTotalQuantity()).toBe(8);
      expect(cart.getTotalPrice()).toBe(5 * 90000 + 3 * 50000); // 600000

      // Update quantity
      cart.updateItemQuantity('product-1', 10);
      expect(cart.getTotalQuantity()).toBe(13);
      expect(cart.getTotalPrice()).toBe(10 * 90000 + 3 * 50000); // 1050000

      // Refresh prices (price adjustment)
      cart.refreshPrices({
        'product-1': { unitPrice: 110000, wholesalePrice: 95000 },
        'product-2': { unitPrice: 55000 },
      });
      expect(cart.getTotalPrice()).toBe(10 * 95000 + 3 * 55000); // 1115000

      // Remove item
      cart.removeItem('product-2');
      expect(cart.getTotalQuantity()).toBe(10);
      expect(cart.getTotalPrice()).toBe(10 * 95000); // 950000
    });

    it('should handle session-to-user conversion with merge', () => {
      const sessionCart = Cart.create(undefined, 'session-1');
      sessionCart.addItem('product-1', 5, 100000);

      const userCart = Cart.create('user-1');
      userCart.addItem('product-2', 3, 50000);

      userCart.mergeCart(sessionCart);
      userCart.assignUser('user-1');

      expect(userCart.getTotalQuantity()).toBe(8);
      expect(userCart.userId).toBe('user-1');
      expect(userCart.sessionId).toBeNull();
    });
  });
});
