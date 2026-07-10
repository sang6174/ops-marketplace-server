export enum UserRole {
  ADMIN = 'ADMIN',
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  SHIPPER = 'SHIPPER',
}

export enum SubAdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TECHNICIAN = 'TECHNICIAN',
  WAREHOUSE_MANAGER = 'WAREHOUSE_MANAGER',
  FINANCE_STAFF = 'FINANCE_STAFF',
  CONTENT_MANAGER = 'CONTENT_MANAGER',
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
}

export enum BuyerType {
  INDIVIDUAL = 'INDIVIDUAL',
  WHOLESALER = 'WHOLESALER',
  BUSINESS = 'BUSINESS',
}

export enum VehicleType {
  MOTORBIKE = 'MOTORBIKE',
  VAN = 'VAN',
  TRUCK = 'TRUCK',
  COLD_TRUCK = 'COLD_TRUCK',
}

export enum ShipmentStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
}
export enum ProductCategory {
  FRUITS = 'FRUITS',
  VEGETABLES = 'VEGETABLES',
  GRAINS = 'GRAINS',
  DAIRY = 'DAIRY',
  MEAT = 'MEAT',
  SEAFOOD = 'SEAFOOD',
  BEVERAGES = 'BEVERAGES',
  OTHER = 'OTHER',
}

export enum ProductUnit {
  KG = 'KG',
  GRAM = 'GRAM',
  TON = 'TON',
  LITER = 'LITER',
  ML = 'ML',
  PIECE = 'PIECE',
  DOZEN = 'DOZEN',
  LOT = 'LOT',
  BOX = 'BOX',
  BUNCH = 'BUNCH',
}

export enum ProductStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum OrderType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  PRE_ORDER = 'PRE_ORDER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PAYPAL = 'PAYPAL',
  MOMO = 'MOMO',
  ZALOPAY = 'ZALOPAY',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export enum NotificationType {
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  PRODUCT = 'PRODUCT',
  SYSTEM = 'SYSTEM',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}
