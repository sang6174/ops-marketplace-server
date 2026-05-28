import { registerAs } from '@nestjs/config';

export const paymentConfig = registerAs('payment', () => ({
  momo: {
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
  },
  stripe: {
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  paypal: {
    webhookId: process.env.PAYPAL_WEBHOOK_ID,
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    apiBaseUrl:
      process.env.PAYPAL_API_BASE_URL ?? 'https://api-m.sandbox.paypal.com',
  },
}));
