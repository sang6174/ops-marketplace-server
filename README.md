# OPS Marketplace Server

Backend API for a multi-vendor marketplace built with **NestJS 11**, **TypeScript**, **Prisma ORM**, and **PostgreSQL**. Supports buyer, seller, and admin workflows including authentication, shop management, product catalog, cart, checkout, Stripe payments, refunds, ledger accounting, and seller payouts.

## Tech Stack

| Layer         | Technology                                                    |
| ------------- | ------------------------------------------------------------- |
| Runtime       | Node.js, TypeScript 6, CommonJS output                        |
| Framework     | NestJS 11                                                     |
| ORM           | Prisma 7 (generated to `src/infrastructure/generated/prisma`) |
| Database      | PostgreSQL via `pg` driver                                    |
| Auth          | JWT access/refresh tokens, Passport, DB-backed sessions       |
| Payments      | Stripe SDK 22 (Checkout, webhooks)                            |
| Validation    | `class-validator` + `class-transformer`                       |
| Documentation | Swagger/OpenAPI via `@nestjs/swagger`                         |
| Logging       | `pino` + `nestjs-pino`                                        |
| Security      | helmet, compression, cookie-parser                            |
| Testing       | Jest 30, Supertest                                            |
| Linting       | ESLint 9 + Prettier                                           |
| Package mgr   | Yarn (Berry, `nodeLinker: node-modules`)                      |

## Architecture

Single-package monolith (not a monorepo). Organized by domain module under `src/modules/`.

```
src/
  main.ts                ΓÇö Bootstrap, CORS, Swagger, global pipes, versioning
  app.module.ts          ΓÇö Root module, config registration, global providers
  common/                ΓÇö Decorators, DTO helpers, interceptors, filters, utilities
  configs/               ΓÇö Env-driven config loaders (app, jwt, db, mail, payment)
  infrastructure/
    prisma/              ΓÇö PrismaService, module, provider, extensions
    generated/prisma/    ΓÇö Prisma client (auto-generated, do not edit)
    mail/                ΓÇö Nodemailer service
  domain/                ΓÇö DDD entities, value-objects, events, repo/service contracts
    entities/__tests__   ΓÇö All existing unit tests
  core/                  ΓÇö Auth guards, idempotency, logging, permission checks, retry
  shared/                ΓÇö Shared DTOs, exceptions
  modules/               ΓÇö 16 domain modules
```

### Path Aliases

| Alias               | Maps to                |
| ------------------- | ---------------------- |
| `@/*`               | `src/*`                |
| `@common/*`         | `src/common/*`         |
| `@modules/*`        | `src/modules/*`        |
| `@infrastructure/*` | `src/infrastructure/*` |
| `@domain/*`         | `src/domain/*`         |
| `@configs/*`        | `src/configs/*`        |
| `@shared/*`         | `src/shared/*`         |
| `@core/*`           | `src/core/*`           |

### Global Providers

- `BaseExceptionFilter` ΓÇö Consistent error response shape
- `LoggingInterceptor` ΓÇö Request/response logging via pino
- `TransformInterceptor` ΓÇö Normalized success response envelope
- `IdempotencyInterceptor` ΓÇö Idempotency-Key support on critical writes
- `RolesAndPermissionsGuard` ΓÇö Role-based and permission-based access control

## Domain Modules (16)

| Module         | Responsibility                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `auth`         | Register, login, refresh token, logout, password reset, JWT strategies                              |
| `user`         | User profile, addresses, bank accounts                                                              |
| `address`      | Address CRUD for users                                                                              |
| `shop`         | Public shops, seller shop operations, admin shop actions                                            |
| `product`      | Products, variants, inventory, images, categories, seller product ops                               |
| `category`     | Product category management                                                                         |
| `inventory`    | Stock tracking per variant                                                                          |
| `cart`         | Cart items, coupon application, checkout                                                            |
| `order`        | Buyer orders, seller order views, admin order operations                                            |
| `payment`      | Stripe Checkout, COD payment, refunds, payment webhooks                                             |
| `shipment`     | Internal shipment management: create, assign shipper, track, update status, cancel, list, dashboard |
| `ledger`       | Ledger accounts, ledger entries, balance views                                                      |
| `payout`       | Seller balance, payout requests, admin payout processing                                            |
| `notification` | In-app notifications                                                                                |
| `bank-account` | Seller bank account management                                                                      |
| `admin`        | Admin user/shop/category/order/product/ledger/payout APIs                                           |

## Core Flows

### Authentication

Users authenticate with email/password. Backend issues access and refresh tokens, stores sessions in the `Session` table. Access token validation checks both JWT signature and active session state, enabling logout and revoke behavior.

### Marketplace Checkout

Buyers add product variants to cart and checkout into marketplace orders. Orders link `userId`, `shopId`, `addressId`, `paymentStatus`, and lifecycle `status`. Seller APIs enforce ownership by resolving the seller shop from the authenticated user.

### Stripe Payment

1. Buyer calls `POST /api/v1/payments/initiate`
2. Backend validates pending orders, creates/reuses a pending payment
3. Backend creates a Stripe Checkout Session, saves `session.id` as `providerRef`
4. Client receives `checkoutUrl` and redirects to Stripe
5. Stripe webhook (`POST /api/v1/webhooks/stripe`) updates payment/order status after signature verification
6. Successful payments credit seller ledger balances

### Idempotency

Critical write APIs support `Idempotency-Key` header. Backend stores request fingerprint, processing status, and final response. Repeated requests with the same key and payload replay the original response; different payloads are rejected. Protects payment creation, ledger updates, payouts, shipping creation, and other write-heavy operations.

### Ledger and Payout

Seller balances tracked via `LedgerAccount` / `LedgerEntry` (not blind mutations). Payment success creates credits; refunds and payouts create debits. Sellers request payouts; admins process them.

## API Documentation

**Swagger** (non-production only): `http://localhost:<PORT>/api/docs`

**URI versioning**: `/api/v1`

### Response Contract

Success:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "requestId": "...",
  "timestamp": "..."
}
```

Error:

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

### Key Endpoints

**Auth**

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

**Payments**

- `POST /api/v1/payments/initiate`
- `GET /api/v1/payments`
- `GET /api/v1/payments/:id`
- `POST /api/v1/webhooks/stripe`

**Payout (seller)**

- `GET /api/v1/seller/balance`
- `GET /api/v1/seller/balance/history`
- `POST /api/v1/seller/payouts/request`
- `GET /api/v1/seller/payouts`

**Admin**

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/shops`
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/ledger/accounts`
- `GET /api/v1/admin/payouts`

## Data Model

| Domain       | Models                                                       |
| ------------ | ------------------------------------------------------------ |
| Identity     | `User`, `Session`, `UserRoleMapping`, `PasswordReset`        |
| Marketplace  | `Shop`, `Product`, `ProductVariant`, `Inventory`, `Category` |
| Cart & Order | `Cart`, `CartItem`, `Order`, `OrderItem`                     |
| Payments     | `Payment`, `PaymentItem`, `Refund`                           |
| Finance      | `LedgerAccount`, `LedgerEntry`, `Payout`, `BankAccount`      |
| Engagement   | `Review`, `Notification`, `ChatRoom`, `Message`              |
| Reliability  | `IdempotencyRequest`                                         |

## Environment Variables

Create a `.env` in the project root:

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

MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your_mail_user
MAIL_PASSWORD=your_mail_password
MAIL_FROM=no-reply@example.com
```

Do not commit `.env` or provider secrets.

## Setup

```bash
# Install dependencies
yarn install

# Start PostgreSQL (Docker)
docker compose -f prisma/docker-compose.yml up -d

# Generate Prisma client and apply migrations
yarn prisma generate
yarn prisma migrate deploy

# Start dev server (watch mode)
yarn start:dev
```

## Scripts

| Command                      | Description                      |
| ---------------------------- | -------------------------------- |
| `yarn start`                 | Start NestJS                     |
| `yarn start:dev`             | Watch-mode dev server            |
| `yarn start:prod`            | Run compiled production build    |
| `yarn build`                 | Compile TypeScript ΓåÆ `dist/`     |
| `yarn lint`                  | ESLint with auto-fix             |
| `yarn format`                | Prettier on `src/` + `test/`     |
| `yarn test`                  | Jest unit tests (`src/`)         |
| `yarn test:e2e`              | E2E tests (requires setup)       |
| `yarn prisma generate`       | Regenerate Prisma client         |
| `yarn prisma migrate deploy` | Apply migrations in CI/prod      |
| `yarn prisma migrate dev`    | Create and apply local migration |

> **Note:** E2E test infra is not set up ΓÇö `test/jest-e2e.json` and `test/` directory are absent.

## Performance & Security

- **Idempotency-Key** header on critical writes; responses include `Idempotency-Replayed` header
- **Rate limiting** via configurable middleware
- **Helmet** security headers
- **Compression** with `compression` middleware
- **Structured logging** with pino
- **Validation pipe** with whitelisting and transform

## Verification Notes

- Stripe secret key connectivity verified
- Stripe Checkout Session creation with valid test amount verified
- Full TypeScript build passes (`yarn build`)
- Full webhook verification requires valid provider webhook secrets and reachable callback URLs

## Development

### Git

- `.gitignore` excludes `.vscode/`, `.yarn/`, `.env`, `prisma/seed.ts`
- No CI workflows or pre-commit hooks yet
- Seeds intentionally not committed
