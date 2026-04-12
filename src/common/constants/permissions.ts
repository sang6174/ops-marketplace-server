export enum Permission {
  // User permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // Category permissions
  CATEGORY_CREATE = 'category:create',
  CATEGORY_READ = 'category:read',
  CATEGORY_UPDATE = 'category:update',
  CATEGORY_DELETE = 'category:delete',

  // Shop permissions
  SHOP_CREATE = 'shop:create',
  SHOP_READ = 'shop:read',
  SHOP_UPDATE = 'shop:update',
  SHOP_DELETE = 'shop:delete',

  // Product permissions
  PRODUCT_CREATE = 'product:create',
  PRODUCT_READ = 'product:read',
  PRODUCT_UPDATE = 'product:update',
  PRODUCT_DELETE = 'product:delete',

  // Order permissions
  ORDER_READ = 'order:read',
  ORDER_UPDATE = 'order:update',

  // Payment permissions
  PAYMENT_READ = 'payment:read',
  PAYMENT_UPDATE = 'payment:update',

  // Ledger permissions
  LEDGER_READ = 'ledger:read',

  // Inventory permissions
  INVENTORY_READ = 'inventory:read',
  INVENTORY_UPDATE = 'inventory:update',
}
