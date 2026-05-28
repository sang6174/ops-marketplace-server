import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingHttpHeaders } from 'http';
import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@infrastructure/generated/prisma/client';
import {
  OrderStatus,
  ShippingStatus,
} from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ResourceNotFoundException } from '@common/exceptions';
import {
  CreateShippingDto,
  PrintShippingLabelDto,
  ShippingFeeQueryDto,
  ShippingProvider,
} from './dtos/shipping.dto';

type ProviderResponse = Record<string, unknown>;

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getOrderShipping(userId: string, orderId: string) {
    const order = await this.getSellerOrder(userId, orderId);
    return {
      orderId: order.id,
      status: order.status,
      shipping: order.shipping,
      address: order.address,
    };
  }

  async createShipping(userId: string, dto: CreateShippingDto) {
    const order = await this.getSellerOrder(userId, dto.orderId);
    if (order.shipping) return order.shipping;

    const providerResponse =
      dto.provider === ShippingProvider.GHN
        ? await this.createGhnOrder(order.id, dto.providerPayload)
        : await this.createGhtkOrder(order.id, dto.providerPayload);
    const trackingCode = this.extractTrackingCode(
      dto.provider,
      providerResponse,
    );
    const fee = this.extractShippingFee(providerResponse);
    const labelUrl = this.extractLabelUrl(providerResponse);

    if (!trackingCode) {
      throw new BadRequestException(
        'Shipping provider response does not include a tracking code',
      );
    }

    return this.prisma.shipping.create({
      data: {
        orderId: order.id,
        provider: dto.provider,
        trackingCode,
        status: ShippingStatus.PENDING,
        fee,
        labelUrl,
        providerRequest: this.toJsonObject(dto.providerPayload ?? {}),
        providerResponse: this.toJsonObject(providerResponse),
      },
    });
  }

  async printLabel(userId: string, dto: PrintShippingLabelDto) {
    const shipping = await this.getSellerShippingByTrackingCode(
      userId,
      dto.trackingCode,
    );
    const provider = this.getProvider(dto.provider, shipping.provider);

    const providerResponse =
      provider === ShippingProvider.GHN
        ? await this.printGhnLabel(dto.trackingCode)
        : await this.printGhtkLabel(dto.trackingCode);
    const labelUrl = this.extractLabelUrl(providerResponse);
    const updatedShipping = await this.prisma.shipping.update({
      where: { id: shipping.id },
      data: {
        ...(labelUrl && { labelUrl }),
        providerResponse: this.toJsonObject(providerResponse),
      },
      include: {
        order: {
          include: {
            address: true,
          },
        },
      },
    });

    return {
      shipping: updatedShipping,
      provider,
      providerResponse,
    };
  }

  async trackShipping(userId: string, trackingCode: string) {
    const shipping = await this.getSellerShippingByTrackingCode(
      userId,
      trackingCode,
    );
    const provider = this.parseProvider(shipping.provider);
    const providerResponse =
      provider === ShippingProvider.GHN
        ? await this.trackGhnOrder(trackingCode)
        : await this.trackGhtkOrder(trackingCode);

    return {
      shipping,
      providerResponse,
    };
  }

  async calculateFee(userId: string, dto: ShippingFeeQueryDto) {
    if (dto.orderId) await this.getSellerOrder(userId, dto.orderId);

    const payload = this.parseJsonPayload(dto.payload);
    const providerResponse =
      dto.provider === ShippingProvider.GHN
        ? await this.calculateGhnFee(payload)
        : await this.calculateGhtkFee(payload);
    const fee = this.extractShippingFee(providerResponse);
    let shipping = null;

    if (dto.orderId) {
      shipping = await this.prisma.shipping.findUnique({
        where: { orderId: dto.orderId },
      });

      if (shipping) {
        shipping = await this.prisma.shipping.update({
          where: { id: shipping.id },
          data: {
            ...(fee !== undefined && { fee }),
            providerRequest: this.toJsonObject(payload),
            providerResponse: this.toJsonObject(providerResponse),
          },
        });
      }
    }

    return {
      provider: dto.provider,
      fee,
      shipping,
      providerResponse,
    };
  }

  async handleWebhook(dto: {
    provider: ShippingProvider;
    payload: Record<string, unknown>;
    query: Record<string, unknown>;
    headers: IncomingHttpHeaders;
    rawBody?: Buffer;
  }) {
    this.verifyWebhook(dto);

    const trackingCode = this.extractTrackingCode(dto.provider, dto.payload);
    if (!trackingCode) {
      return { received: true, matched: false };
    }

    const shipping = await this.prisma.shipping.findFirst({
      where: { trackingCode },
    });
    if (!shipping) {
      return { received: true, matched: false };
    }

    const status = this.mapShippingStatus(dto.provider, dto.payload);
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedShipping = await tx.shipping.update({
        where: { id: shipping.id },
        data: {
          status,
          lastWebhookPayload: this.toJsonObject(dto.payload),
        },
      });

      const orderStatusUpdate = this.toOrderStatusUpdate(status);
      if (Object.keys(orderStatusUpdate).length > 0) {
        await tx.order.update({
          where: { id: shipping.orderId },
          data: orderStatusUpdate,
        });
      }

      return updatedShipping;
    });

    return {
      received: true,
      matched: true,
      shipping: updated,
    };
  }

  private async createGhnOrder(
    orderId: string,
    providerPayload?: Record<string, unknown>,
  ) {
    const { baseUrl, token, shopId } = this.getGhnConfig();
    return this.fetchProvider(`${baseUrl}/shipping-order/create`, {
      method: 'POST',
      headers: this.ghnHeaders(token, shopId),
      body: JSON.stringify({
        client_order_code: orderId,
        ...(providerPayload ?? {}),
      }),
    });
  }

  private async createGhtkOrder(
    orderId: string,
    providerPayload?: Record<string, unknown>,
  ) {
    const { baseUrl, token } = this.getGhtkConfig();
    const payload = providerPayload ?? {};
    const orderPayload = this.getRecord(payload.order) ?? {};

    return this.fetchProvider(`${baseUrl}/services/shipment/order/?ver=1.5`, {
      method: 'POST',
      headers: this.ghtkHeaders(token),
      body: JSON.stringify({
        ...payload,
        order: {
          id: orderId,
          ...orderPayload,
        },
      }),
    });
  }

  private async printGhnLabel(trackingCode: string) {
    const { baseUrl, token, shopId } = this.getGhnConfig();
    return this.fetchProvider(`${baseUrl}/a5/gen-token`, {
      method: 'POST',
      headers: this.ghnHeaders(token, shopId),
      body: JSON.stringify({ order_codes: [trackingCode] }),
    });
  }

  private async printGhtkLabel(trackingCode: string) {
    const { baseUrl, token } = this.getGhtkConfig();
    return this.fetchProvider(`${baseUrl}/services/label/${trackingCode}`, {
      method: 'GET',
      headers: { Token: token },
    });
  }

  private async trackGhnOrder(trackingCode: string) {
    const { baseUrl, token, shopId } = this.getGhnConfig();
    return this.fetchProvider(`${baseUrl}/shipping-order/detail`, {
      method: 'POST',
      headers: this.ghnHeaders(token, shopId),
      body: JSON.stringify({ order_code: trackingCode }),
    });
  }

  private async trackGhtkOrder(trackingCode: string) {
    const { baseUrl, token } = this.getGhtkConfig();
    return this.fetchProvider(
      `${baseUrl}/services/shipment/v2/${trackingCode}`,
      {
        method: 'GET',
        headers: { Token: token },
      },
    );
  }

  private async calculateGhnFee(payload: Record<string, unknown>) {
    const { baseUrl, token, shopId } = this.getGhnConfig();
    return this.fetchProvider(`${baseUrl}/shipping-order/fee`, {
      method: 'POST',
      headers: this.ghnHeaders(token, shopId),
      body: JSON.stringify(payload),
    });
  }

  private async calculateGhtkFee(payload: Record<string, unknown>) {
    const { baseUrl, token } = this.getGhtkConfig();
    const query = new URLSearchParams(
      Object.entries(payload).reduce<Record<string, string>>(
        (params, [key, value]) => ({
          ...params,
          [key]: String(value),
        }),
        {},
      ),
    );

    return this.fetchProvider(
      `${baseUrl}/services/shipment/fee?${query.toString()}`,
      {
        method: 'GET',
        headers: { Token: token },
      },
    );
  }

  private async getSellerOrder(userId: string, orderId: string) {
    const shop = await this.getSellerShop(userId);
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        shopId: shop.id,
        deletedAt: null,
      },
      include: {
        address: true,
        items: true,
        shipping: true,
      },
    });

    if (!order) throw new ResourceNotFoundException('Order', orderId);
    return order;
  }

  private async getSellerShop(userId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!shop) throw new ResourceNotFoundException('Shop');
    return shop;
  }

  private async getSellerShippingByTrackingCode(
    userId: string,
    trackingCode: string,
  ) {
    const shop = await this.getSellerShop(userId);
    const shipping = await this.prisma.shipping.findFirst({
      where: {
        trackingCode,
        order: {
          shopId: shop.id,
          deletedAt: null,
        },
      },
      include: {
        order: {
          include: {
            address: true,
          },
        },
      },
    });

    if (!shipping) {
      throw new ResourceNotFoundException('Shipping', trackingCode);
    }

    return shipping;
  }

  private getGhnConfig() {
    const baseUrl = this.configService.get<string>('shipping.ghn.baseUrl');
    const token = this.configService.get<string>('shipping.ghn.token');
    const shopId = this.configService.get<string>('shipping.ghn.shopId');
    if (!baseUrl || !token || !shopId) {
      throw new BadRequestException(
        'GHN_TOKEN, GHN_SHOP_ID and GHN_BASE_URL are required',
      );
    }
    return { baseUrl, token, shopId };
  }

  private getGhtkConfig() {
    const baseUrl = this.configService.get<string>('shipping.ghtk.baseUrl');
    const token = this.configService.get<string>('shipping.ghtk.token');
    if (!baseUrl || !token) {
      throw new BadRequestException(
        'GHTK_TOKEN and GHTK_BASE_URL are required',
      );
    }
    return { baseUrl, token };
  }

  private ghnHeaders(token: string, shopId: string) {
    return {
      'Content-Type': 'application/json',
      Token: token,
      ShopId: shopId,
    };
  }

  private ghtkHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      Token: token,
    };
  }

  private async fetchProvider(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json')
      ? ((await response.json()) as ProviderResponse)
      : { raw: await response.text() };

    if (!response.ok) {
      throw new BadRequestException({
        message: 'Shipping provider request failed',
        status: response.status,
        body,
      });
    }

    return body;
  }

  private verifyWebhook(dto: {
    provider: ShippingProvider;
    payload: Record<string, unknown>;
    query: Record<string, unknown>;
    headers: IncomingHttpHeaders;
    rawBody?: Buffer;
  }) {
    if (dto.provider === ShippingProvider.GHN) {
      this.verifyGhnWebhook(dto.headers, dto.rawBody);
      return;
    }

    this.verifyGhtkWebhook(dto.payload, dto.query);
  }

  private verifyGhnWebhook(headers: IncomingHttpHeaders, rawBody?: Buffer) {
    const secret = this.configService.get<string>('shipping.ghn.webhookSecret');
    if (secret) {
      const signature = this.getHeader(headers, 'x-ops-signature');
      if (!signature || !rawBody) {
        throw new UnauthorizedException('GHN webhook signature is missing');
      }

      const expected = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      if (!this.safeCompare(signature, expected)) {
        throw new UnauthorizedException('GHN webhook signature is invalid');
      }
      return;
    }

    const expectedToken = this.configService.get<string>(
      'shipping.ghn.webhookToken',
    );
    if (!expectedToken) return;

    const token =
      this.getHeader(headers, 'token') ??
      this.getHeader(headers, 'x-ghn-token');
    if (!token || !this.safeCompare(token, expectedToken)) {
      throw new UnauthorizedException('GHN webhook token is invalid');
    }
  }

  private verifyGhtkWebhook(
    payload: Record<string, unknown>,
    query: Record<string, unknown>,
  ) {
    const expectedHash = this.configService.get<string>(
      'shipping.ghtk.webhookHash',
    );
    if (!expectedHash) return;

    const hash =
      this.getString(query.hash) ??
      this.getString(payload.hash) ??
      this.getString(payload.verify_hash);
    if (!hash || !this.safeCompare(hash, expectedHash)) {
      throw new UnauthorizedException('GHTK webhook hash is invalid');
    }
  }

  private extractTrackingCode(
    provider: ShippingProvider,
    payload: Record<string, unknown>,
  ) {
    const data = this.getRecord(payload.data);
    const order = this.getRecord(payload.order);

    if (provider === ShippingProvider.GHN) {
      return (
        this.getString(payload.order_code) ??
        this.getString(payload.OrderCode) ??
        this.getString(payload.trackingCode) ??
        this.getString(data?.order_code) ??
        this.getString(data?.OrderCode)
      );
    }

    return (
      this.getString(payload.label_id) ??
      this.getString(payload.label) ??
      this.getString(payload.trackingCode) ??
      this.getString(payload.partner_id) ??
      this.getString(order?.label) ??
      this.getString(order?.label_id) ??
      this.getString(data?.label)
    );
  }

  private extractShippingFee(payload: Record<string, unknown>) {
    const data = this.getRecord(payload.data);
    const fee =
      this.getNumber(data?.total) ??
      this.getNumber(data?.service_fee) ??
      this.getNumber(data?.fee) ??
      this.getNumber(payload.fee) ??
      this.getNumber(payload.total) ??
      this.getNumber(payload.ship_money);

    return fee === undefined ? undefined : fee.toString();
  }

  private extractLabelUrl(payload: Record<string, unknown>) {
    const data = this.getRecord(payload.data);
    const order = this.getRecord(payload.order);
    return (
      this.getString(payload.labelUrl) ??
      this.getString(payload.label_url) ??
      this.getString(payload.print_url) ??
      this.getString(payload.url) ??
      this.getString(data?.token) ??
      this.getString(data?.labelUrl) ??
      this.getString(data?.label_url) ??
      this.getString(data?.print_url) ??
      this.getString(order?.label_url)
    );
  }

  private mapShippingStatus(
    provider: ShippingProvider,
    payload: Record<string, unknown>,
  ) {
    const status = (
      this.getString(payload.status) ??
      this.getString(payload.Status) ??
      this.getString(payload.status_id) ??
      this.getString(payload.action) ??
      ''
    )
      .trim()
      .toLowerCase();

    if (
      status.includes('delivered') ||
      status.includes('success') ||
      status.includes('delivered_complete') ||
      (provider === ShippingProvider.GHTK && ['5', '6'].includes(status))
    ) {
      return ShippingStatus.DELIVERED;
    }

    if (
      status.includes('ready') ||
      status.includes('picking') ||
      status.includes('shipping') ||
      status.includes('transport') ||
      status.includes('delivery') ||
      (provider === ShippingProvider.GHTK && ['2', '3', '4'].includes(status))
    ) {
      return ShippingStatus.SHIPPING;
    }

    return ShippingStatus.PENDING;
  }

  private toOrderStatusUpdate(status: ShippingStatus) {
    if (status === ShippingStatus.DELIVERED) {
      return {
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
        shippedAt: new Date(),
      };
    }

    if (status === ShippingStatus.SHIPPING) {
      return {
        status: OrderStatus.SHIPPING,
        shippedAt: new Date(),
      };
    }

    return {};
  }

  private getProvider(
    requestedProvider: ShippingProvider,
    existingProvider?: string | null,
  ) {
    const provider = this.parseProvider(existingProvider);
    if (provider !== requestedProvider) {
      throw new BadRequestException('Shipping provider does not match');
    }
    return provider;
  }

  private parseProvider(provider?: string | null) {
    if (provider === ShippingProvider.GHN) return ShippingProvider.GHN;
    if (provider === ShippingProvider.GHTK) return ShippingProvider.GHTK;
    throw new BadRequestException('Unsupported shipping provider');
  }

  private parseJsonPayload(payload?: string) {
    if (!payload) return {};
    try {
      const parsed = JSON.parse(payload) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid payload');
      }
      return parsed as Record<string, unknown>;
    } catch {
      throw new BadRequestException('payload must be a valid JSON object');
    }
  }

  private getHeader(headers: IncomingHttpHeaders, name: string) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
  }

  private getRecord(value: unknown) {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private getString(value: unknown) {
    if (value === undefined || value === null) return undefined;
    return String(value);
  }

  private getNumber(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }

  private toJsonObject(value: Record<string, unknown>) {
    return value as Prisma.InputJsonObject;
  }

  private safeCompare(actual: string, expected: string) {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
