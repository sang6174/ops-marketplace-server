# OPS Marketplace Server

Backend API for a multi-vendor marketplace built with NestJS, TypeScript, Prisma, and PostgreSQL. The system supports buyer, seller, and admin workflows including authentication, shop management, product catalog, cart, checkout, orders, Stripe payments, GHN shipping, refunds, ledger accounting, and seller payouts.

## Highlights

- Multi-vendor marketplace backend with buyer, seller, and admin roles.
- JWT access/refresh authentication with DB-backed session validation.
- Role-based authorization and seller ownership checks for shop-owned resources.
- Product catalog with products, variants, inventory, images, categories, and reviews.
- Cart and checkout flow with per-shop order handling.
- Stripe Checkout integration for online payments.
- Idempotency layer for critical write APIs using `Idempotency-Key`.
- Seller ledger and payout workflows with auditable financial entries.
- GHN-only shipping integration for fee calculation, order creation, tracking, labels, and webhooks.
- Consistent API response and error contract through global interceptors and filters.

## Tech Stack

- NestJS 11
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication
- Stripe SDK
- GHN shipping API
- Swagger/OpenAPI
- Yarn
- ESLint and Prettier

## Architecture

The codebase is organized by domain modules. Controllers handle routing, guards, role decorators, and DTO validation. Services contain business logic and interact with PostgreSQL through `PrismaService`. Shared infrastructure such as decorators, interceptors, exception filters, config loaders, and Prisma live outside domain modules.

Main layers:

- `src/main.ts`: app bootstrap, CORS, middleware, validation, Swagger, versioning.
- `src/app.module.ts`: root module, config registration, global providers.
- `src/common/`: decorators, DTO helpers, interceptors, filters, utilities.
- `src/configs/`: app, JWT, database, payment, and shipping configuration.
- `src/infrastructure/prisma/`: Prisma service and generated client.
- `src/modules/`: domain APIs.
- `prisma/schema.prisma`: database schema and relationships.

## Domain Modules

- `auth`: register, login, refresh token, logout, password reset, JWT strategies.
- `user`: user profile, addresses, bank accounts.
- `shop`: public shops, seller shop operations, admin shop actions.
- `product`: products, variants, inventory, images, categories, seller product operations.
- `cart`: cart items, coupon application, checkout.
- `order`: buyer orders, seller order views, admin order operations.
- `payment`: Stripe payment, COD payment, refunds, payment webhooks.
- `shipping`: GHN fee calculation, create shipping, tracking, labels, shipping webhook.
- `ledger`: ledger accounts, ledger entries, balance views.
- `payout`: seller balance, payout requests, admin payout processing.
- `admin`: admin user/shop/category/order/product/ledger/payout APIs.

## Core Flows

### Authentication

Users authenticate with email/password. The backend issues access and refresh tokens and stores sessions in the database. Access token validation checks both JWT signature and active session state, allowing logout/revoke behavior.

### Marketplace Checkout

Buyers add product variants to cart and checkout into marketplace orders. Orders are linked to `userId`, `shopId`, `addressId`, `paymentStatus`, and lifecycle `status`. Seller APIs enforce ownership by resolving the seller shop from the authenticated user.

### Stripe Payment

Online payment uses Stripe Checkout:

1. Buyer calls `POST /api/v1/payments/initiate`.
2. Backend validates pending orders.
3. Backend creates or reuses a pending payment.
4. Backend creates a Stripe Checkout Session.
5. Stripe session id is saved as `providerRef`.
6. Client receives `checkoutUrl`.
7. Stripe webhook updates payment/order status after signature verification.
8. Successful payments credit seller ledger balances.

### Idempotency

Critical write APIs support `Idempotency-Key`. The backend stores a request fingerprint, processing status, and final response. Repeated requests with the same key and payload replay the original response; repeated requests with a different payload are rejected.

This protects flows such as payment creation, ledger updates, payouts, shipping creation, and other write-heavy operations from duplicate retries.

### Ledger and Payout

Seller balances are tracked through ledger accounts and ledger entries instead of blind balance mutations. Payment success creates credits. Refunds and payouts create debits. Payouts are requested by sellers and processed by admins.

### GHN Shipping

Shipping is GHN-only. The backend calculates shipping fees, builds GHN create-order payloads from marketplace orders, stores tracking information, supports label retrieval and tracking, and handles GHN webhook status updates.

The current address schema does not store all GHN-specific fields, so create shipping accepts fields such as `toPhone`, `toWardCode`, `toDistrictId`, package dimensions, service type, and required note.

## API Documentation

In non-production environments, Swagger is available at:

```text
http://localhost:<PORT>/api/docs
```

The API uses URI versioning:

```text
/api/v1
```

Success responses are normalized:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "requestId": "...",
  "timestamp": "..."
}
```

Error responses are normalized:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "...",
  "requestId": "...",
  "timestamp": "...",
  "path": "..."
}
```

## Environment Variables

Create a `.env` file in the server directory.

```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

DATABASE_URL=postgresql://postgres:password@localhost:5432/ops_marketplace

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:3000/payment/success
STRIPE_CANCEL_URL=http://localhost:3000/payment/cancel

GHN_TOKEN=your_ghn_token
GHN_SHOP_ID=your_ghn_shop_id
GHN_BASE_URL=https://dev-online-gateway.ghn.vn/shiip/public-api/v2
GHN_WEBHOOK_SECRET=
GHN_WEBHOOK_TOKEN=

MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your_mail_user
MAIL_PASSWORD=your_mail_password
MAIL_FROM=no-reply@example.com
```

Do not commit `.env` or provider secrets.

## Setup

Install dependencies:

```bash
yarn install
```

Generate Prisma client:

```bash
yarn prisma generate
```

Run migrations:

```bash
yarn prisma migrate deploy
```

For local development migrations:

```bash
yarn prisma migrate dev
```

Start the app:

```bash
yarn start:dev
```

Build:

```bash
yarn build
```

Run production build:

```bash
yarn start:prod
```

## Useful Scripts

- `yarn start`: start NestJS.
- `yarn start:dev`: start in watch mode.
- `yarn start:prod`: run compiled production build.
- `yarn build`: compile TypeScript.
- `yarn lint`: run ESLint with auto-fix.
- `yarn test`: run Jest tests.
- `yarn test:e2e`: run e2e tests.
- `yarn prettier --write <paths>`: format selected files.
- `yarn prisma generate`: generate Prisma client.
- `yarn prisma migrate deploy`: apply migrations.
- `yarn prisma migrate dev`: create/apply local migration.

## Important API Areas

Authentication:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

Payments:

- `POST /api/v1/payments/initiate`
- `GET /api/v1/payments`
- `GET /api/v1/payments/:id`
- `POST /api/v1/webhooks/stripe`

Shipping:

- `GET /api/v1/seller/shipping/fees`
- `POST /api/v1/seller/shipping/create`
- `GET /api/v1/seller/shipping/track/:trackingCode`
- `POST /api/v1/seller/shipping/print-label`
- `POST /api/v1/webhooks/shipping/ghn`

Seller payout:

- `GET /api/v1/seller/balance`
- `GET /api/v1/seller/balance/history`
- `POST /api/v1/seller/payouts/request`
- `GET /api/v1/seller/payouts`

Admin:

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/shops`
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/ledger/accounts`
- `GET /api/v1/admin/payouts`

## Data Model Overview

Important models:

- Identity: `User`, `Session`, `UserRoleMapping`, `PasswordReset`.
- Marketplace: `Shop`, `Product`, `ProductVariant`, `Inventory`, `Category`.
- Cart and orders: `Cart`, `CartItem`, `Order`, `OrderItem`.
- Payments: `Payment`, `PaymentItem`, `Refund`.
- Shipping: `Shipping`.
- Finance: `LedgerAccount`, `LedgerEntry`, `Payout`, `BankAccount`.
- Engagement: `Review`, `Notification`, `ChatRoom`, `Message`.
- Reliability: `IdempotencyRequest`.

## Verification Notes

Implemented and verified during development:

- Stripe secret key connectivity.
- Stripe Checkout Session creation with valid test amount.
- GHN fee calculation through backend with valid GHN credentials.
- TypeScript build with `yarn build`.

Full webhook verification requires valid provider webhook secrets and reachable callback URLs.

## Additional Documentation

- `docs/codex-guidelines.md`: backend coding guidelines.
- `docs/review-architecture.README`: high-level architecture review.
- `docs/review-source-code.README`: API and source-code flow review.

