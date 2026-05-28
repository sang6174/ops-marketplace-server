import { registerAs } from '@nestjs/config';

export const shippingConfig = registerAs('shipping', () => ({
  ghn: {
    token: process.env.GHN_TOKEN,
    shopId: process.env.GHN_SHOP_ID,
    baseUrl:
      process.env.GHN_BASE_URL ??
      'https://dev-online-gateway.ghn.vn/shiip/public-api/v2',
    webhookToken: process.env.GHN_WEBHOOK_TOKEN,
    webhookSecret: process.env.GHN_WEBHOOK_SECRET,
  },
  ghtk: {
    token: process.env.GHTK_TOKEN,
    baseUrl:
      process.env.GHTK_BASE_URL ?? 'https://services.giaohangtietkiem.vn',
    webhookHash: process.env.GHTK_WEBHOOK_HASH,
  },
}));
