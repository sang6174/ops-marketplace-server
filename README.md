# OPS Marketplace Server

Multi-vendor agricultural marketplace API. NestJS 11 + Domain-Driven Design with 14 repositories, 40+ use cases, event-driven architecture, and 529 unit tests.

## Stack

NestJS 11 · Prisma · PostgreSQL · TypeScript · Jest · Pino · Swagger · Stripe

## Architecture

```
src/
├── domain/              Entities, value objects, events, repo/service contracts
├── modules/             Feature modules (16) — controllers, services, DTOs
│   └── */applications/  Use cases (40+)
│   └── */infrastructure/  Prisma repository implementations (14)
├── infrastructure/      Prisma service, event bus, mail
├── common/              Decorators, interceptors, filters, guards
├── configs/             Env-driven configuration
└── shared/              Shared DTOs, exceptions
```

## Modules

| Module       | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| Auth         | Register, login, refresh, email verify, password reset, RBAC    |
| User         | Profile, addresses, bank accounts, seller onboarding            |
| Product      | CRUD, wholesale pricing, seasonal, certifications, inventory    |
| Order        | Cart checkout, status lifecycle, payment sync, event publishing |
| Payment      | Stripe/MoMo, refunds, COD, webhooks                             |
| Payout       | Seller balance, bank transfer, ledger reconciliation            |
| Cart         | Add/remove/update items, guest merge, checkout                  |
| Shop         | Seller registration, verification, product management           |
| Category     | Tree structure, product assignment                              |
| Notification | Multi-channel (email, SMS, push, internal)                      |
| Shipment     | Shipper assignment, tracking, status lifecycle                  |
| Ledger       | Double-entry accounting for platform fees                       |
| Admin        | User/shop/category/order/ledger/payout management               |

## Quick Start

```bash
cp .env.example .env
docker compose -f prisma/docker-compose.yml up -d
yarn prisma db push
yarn start:dev
```

API docs at `http://localhost:3500/api/docs`

## API

Base path: `/api/v1`

### Response format

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "requestId": "...",
  "timestamp": "..."
}
```

### Key endpoints

| Method | Path                      | Description             |
| ------ | ------------------------- | ----------------------- |
| POST   | `/auth/register`          | Register                |
| POST   | `/auth/login`             | Login                   |
| POST   | `/auth/refresh`           | Refresh token           |
| POST   | `/products`               | Create product (seller) |
| GET    | `/products`               | List products           |
| GET    | `/cart`                   | Get cart                |
| POST   | `/cart/checkout`          | Checkout                |
| GET    | `/orders`                 | List orders             |
| POST   | `/payments/initiate`      | Initiate payment        |
| POST   | `/webhooks/stripe`        | Stripe webhook          |
| GET    | `/seller/balance`         | Seller balance          |
| POST   | `/seller/payouts/request` | Request payout          |

## Environment Variables

```env
NODE_ENV=development
PORT=3500
APP_URL=http://localhost:3500

DATABASE_URL=postgresql://user:password@localhost:5432/development

JWT_ACCESS_SECRET=your_secret
JWT_ACCESS_EXPIRES=15m

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=user
MAIL_PASSWORD=password
MAIL_FROM=noreply@example.com
```

## Scripts

| Command                | Description              |
| ---------------------- | ------------------------ |
| `yarn start:dev`       | Dev server (watch mode)  |
| `yarn build`           | Compile TypeScript       |
| `yarn test`            | Run unit tests           |
| `yarn lint`            | Lint                     |
| `yarn format`          | Format with Prettier     |
| `yarn prisma generate` | Regenerate Prisma client |
| `yarn prisma db push`  | Sync schema to database  |
