import { registerAs } from '@nestjs/config';

export const paymentConfig = registerAs('payment', () => ({
  stripe: {
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
}));
