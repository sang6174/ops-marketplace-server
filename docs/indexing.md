# Database Indexing Strategy

This document outlines all active indexes in the ops-marketplace database schema. Each index is retained because it directly supports active query patterns in the application code.

## Core Principles

1. **Every index must serve a real query** — no speculative indexes
2. **Compound indexes over multiple single-column** — saves storage and maintenance
3. **Soft-delete filters paired with business logic** — `deletedAt` + `status`/`userId`/`shopId`
4. **Pagination-friendly** — `(userId/shopId, createdAt)` for cursor-based pagination

---

## User Management

### User
```sql
-- Filter users by soft-delete status
@@index([deletedAt])

-- Account status queries (active vs suspended vs pending)
@@index([status])
```
**Used in:** Account activation, user status checks, admin dashboards

---

### Session
```sql
-- Lookup user's sessions for logout/invalidation
@@index([userId])

-- Clean up expired sessions
@@index([expiresAt])
```
**Used in:** Session validation, token refresh, session revocation

---

### PasswordReset
```sql
-- Find reset request by user
@@index([userId])

-- Auto-expire old reset tokens
@@index([expiresAt])
```
**Used in:** Password recovery flow, token cleanup

---

### Address
```sql
-- Get user's addresses (with soft-delete filter)
@@index([userId, deletedAt])

-- Auto-select default address at checkout
@@index([userId, isDefault])
```
**Used in:** Checkout address selection, profile management, soft-delete filtering

---

## Shop Management

### Shop
```sql
-- Get seller's shop (most common lookup)
-- Every seller action: listMyProducts, listShopOrders, updateInventory
@@index([ownerId, deletedAt])
```
**Used in:** Every seller endpoint (product CRUD, order management, payouts)

---

## Product Catalog

### Product
```sql
-- Get shop's active products (seller dashboard)
@@index([shopId, status, deletedAt])

-- Public product listing (browse by status)
@@index([status, deletedAt])
```
**Used in:**
- Seller: `listMyProducts({ where: { shopId, deletedAt: null, status } })`
- Buyer: `listProducts({ where: { status: ACTIVE, deletedAt: null } })`

---

### ProductVariant
```sql
-- Get active variants for a product (checkout, detail page)
-- Query: findMany({ where: { productId, deletedAt: null, isActive: true } })
@@index([productId, isActive, deletedAt])
```
**Used in:**
- `getVariants()` — product detail page
- `createOrdersFromCart()` — checkout validation
- Inventory management

---

### ProductImage
```sql
-- Load images when rendering product detail
@@index([productId])
```
**Used in:** Product detail view, image gallery

---

### VariantImage
```sql
-- Load variant-specific images
@@index([variantId])
```
**Used in:** Variant display, image carousel

---

### Category
```sql
-- Navigate category tree (parentId for hierarchy traversal)
@@index([parentId])

-- Exclude deleted categories from queries
@@index([deletedAt])
```
**Used in:** Category listing, nested category navigation

---

### Attribute
```sql
-- Get attributes for a category when building product variant forms
@@index([categoryId])
```
**Used in:** Variant attribute builder UI

---

### AttributeValue
```sql
-- Lookup attribute values for filtering
@@index([attributeId])
```
**Used in:** Populate attribute dropdowns

---

## Shopping & Checkout

### Cart
```sql
-- Get or create user's active cart
@@index([userId])

-- Find carts by status (for cleanup jobs)
@@index([status])
```
**Used in:**
- Every add-to-cart: `findFirst({ where: { userId, status: ACTIVE } })`
- Cleanup: `findMany({ where: { status: EXPIRED } })`

---

### CartItem
```sql
-- Get all items in a cart (for checkout view and total calculation)
@@unique([cartId, variantId])
@@index([cartId])
```
**Used in:** Cart view, checkout flow

---

## Orders & Payments

### Order
```sql
-- Get buyer's orders by status (my orders page)
@@index([userId, status, deletedAt])

-- Get seller's orders by status (seller dashboard)
@@index([shopId, status, deletedAt])

-- Paginate buyer's orders by creation time
@@index([userId, createdAt])

-- Paginate seller's orders by creation time
@@index([shopId, createdAt])

-- Filter soft-deleted orders from payment status queries
@@index([paymentStatus, deletedAt])
```
**Used in:**
- Buyer: `listOrders({ where: { userId, status?, deletedAt: null } })`
- Seller: `listShopOrders({ where: { shopId, status?, deletedAt: null } })`
- Payment status tracking and order reconciliation

---

### OrderItem
```sql
-- Get items in an order
@@index([orderId])

-- Seller dashboard: items by shop
@@index([shopId])
```
**Used in:**
- Order detail view
- Seller order management

---

### Payment
```sql
-- Get user's payments by status (payment history)
@@index([userId, status, deletedAt])

-- Find recent payments by status (admin reconciliation)
@@index([status, createdAt])

-- Exclude deleted payments from all queries
@@index([deletedAt])
```
**Used in:**
- Buyer: `listPayments({ where: { userId, status?, deletedAt: null } })`
- Admin: Payment reconciliation and status tracking
- Webhook processing: `findFirst({ where: { deletedAt: null, provider: STRIPE, ... } })`

---

### PaymentItem
```sql
-- Composite key: payment ↔ order relationship maintained by Prisma
-- Foreign key constraint handles deletion cascade
```

---

### Refund
```sql
-- Get buyer's refund requests by status
@@index([userId, status, deletedAt])

-- Get seller's incoming refund requests by status
@@index([shopId, status, deletedAt])

-- Check if refund already exists for order
@@index([orderId])
```
**Used in:**
- Buyer: `listRefunds({ where: { userId, status?, deletedAt: null } })`
- Seller: `listSellerRefunds({ where: { shopId, status?, deletedAt: null } })`
- Duplicate prevention: `findFirst({ where: { orderId, userId, status: { in: [REQUESTED, APPROVED, REFUNDED] } } })`

---

## Financial Ledger

### LedgerAccount
```sql
-- Find seller's balance/available accounts
-- Every payout and refund operation needs this lookup:
-- upsert({ where: { ownerId_type: { ownerId, type } } })
@@unique([ownerId, type])
@@index([ownerId, type])
```
**Used in:**
- `creditSellerBalance()` — when payment succeeds
- `recordRefundLedgerEntries()` — when refund approved
- Seller payout calculation

---

### LedgerEntry
```sql
-- Idempotency check: prevent duplicate ledger entries
-- Composite unique constraint: (accountId, transactionId, category)
-- Lookup by transactionId for transaction audit
@@index([transactionId])
```
**Used in:**
- `createLedgerEntryIfMissing()` — duplicate detection
- Transaction audit trail

---

### IdempotencyRequest
```sql
-- Cleanup expired idempotency records
@@index([expiresAt])
```
**Used in:** Idempotency key expiration cleanup

---

## Notifications & Chat

### Notification
```sql
-- Get user's unread notifications (notification badge count)
-- Query: findMany({ where: { userId, isRead: false } })
@@index([userId, isRead, createdAt])
```
**Used in:**
- Real-time notification counts
- Notification history with read status filter

---

### Message
```sql
-- Load chat history for a room (paginated)
-- Query: findMany({ where: { roomId }, orderBy: { createdAt: desc } })
@@index([roomId, createdAt])

-- Lookup messages sent by user (rare but useful for activity audit)
@@index([senderId])
```
**Used in:**
- Chat message loading
- User activity tracking

---

### ChatRoom
```sql
-- Lookup room by buyer & seller (composite constraint)
@@unique([buyerId, sellerId])

-- Find rooms where user is buyer
@@index([buyerId])

-- Find rooms where user is seller
@@index([sellerId])
```
**Used in:** Room listing, direct messaging between buyer/seller

---

## Shipping

### Shipping
```sql
-- Track shipments by status (admin dashboard)
@@index([status])
```
**Used in:**
- Shipment status tracking
- Delivery status updates

---

## Reviews

### Review
```sql
-- Get product reviews (product detail page)
-- Exclude deleted reviews, order by creation time
@@unique([userId, productId])
@@index([productId, deletedAt])
```
**Used in:**
- `getReviews()` — product detail page, load reviews with pagination
- One review per product per user constraint

---

## Audit & System

### AuditLog
```sql
-- Find audit entries by entity
@@index([entity, entityId])

-- Find recent audit entries
@@index([createdAt])
```
**Used in:** Compliance audits, activity tracking

---

## Summary

| Category | Table | Index Count |
|----------|-------|-------------|
| **User Management** | User, Session, PasswordReset | 5 |
| **Shops & Products** | Shop, Product, ProductVariant, ProductImage, VariantImage, Category, Attribute, AttributeValue | 11 |
| **Shopping** | Cart, CartItem | 3 |
| **Orders & Payments** | Order, OrderItem, Payment, Refund | 11 |
| **Ledger** | LedgerAccount, LedgerEntry, IdempotencyRequest | 4 |
| **Notifications & Chat** | Notification, Message, ChatRoom | 6 |
| **Shipping & Reviews** | Shipping, Review | 3 |
| **System** | AuditLog, Address | 3 |
| **TOTAL** | 38 tables | **38 active indexes** |

---

## Performance Guidelines

### When to Add a New Index

Add an index if:
1. A `SELECT` query consistently runs > 100ms
2. You can identify the WHERE/ORDER BY columns from slow logs
3. The index would be compound (not single-column, unless it's a foreign key)
4. The index serves multiple queries (not a one-off optimization)

**Do NOT add:**
- Single-column indexes on low-cardinality enums (PaymentStatus, OrderStatus, etc.)
- Indexes for writes (INSERT/UPDATE/DELETE are slower with more indexes)
- Speculative indexes "just in case"

### How to Diagnose Slow Queries

```sql
-- Analyze query plan (development)
EXPLAIN ANALYZE SELECT * FROM orders WHERE userId = $1 AND status = $2;

-- Check if index is being used
EXPLAIN SELECT * FROM orders WHERE userId = $1 AND status = $2;
-- Look for "Index Scan" or "Index Only Scan"

-- Check index bloat over time
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Index Maintenance

Periodically (weekly in production):
```sql
-- Reindex bloated indexes
REINDEX INDEX CONCURRENTLY index_name;

-- Analyze table statistics
ANALYZE table_name;
```

---

## Related Files

- **Schema**: `prisma/schema.prisma`
- **Migrations**: `prisma/migrations/`
- **Service Queries**: `src/modules/*/**.service.ts`
