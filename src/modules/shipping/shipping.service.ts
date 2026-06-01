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
  GhnRequiredNote,
  CreateShippingDto,
  PrintShippingLabelDto,
  ShippingFeeQueryDto,
} from './dtos/shipping.dto';

type ProviderResponse = Record<string, unknown>;
type SellerOrder = Prisma.OrderGetPayload<{
  include: {
    user: { select: { name: true; email: true } };
    address: true;
    items: true;
    shipping: true;
  };
}>;
const GHN_PROVIDER = 'GHN';
const DEFAULT_GHN_PACKAGE = {
  weight: 200,
  length: 10,
  width: 10,
  height: 10,
};

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

    const providerResponse = await this.createGhnOrder(order, dto);
    const trackingCode = this.extractTrackingCode(providerResponse);
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
        provider: GHN_PROVIDER,
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
    this.assertGhnShipping(shipping.provider);

    const providerResponse = await this.printGhnLabel(dto.trackingCode);
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
      provider: GHN_PROVIDER,
      providerResponse,
    };
  }

  async trackShipping(userId: string, trackingCode: string) {
    const shipping = await this.getSellerShippingByTrackingCode(
      userId,
      trackingCode,
    );
    this.assertGhnShipping(shipping.provider);
    const providerResponse = await this.trackGhnOrder(trackingCode);

    return {
      shipping,
      providerResponse,
    };
  }

  async calculateFee(userId: string, dto: ShippingFeeQueryDto) {
    if (dto.orderId) await this.getSellerOrder(userId, dto.orderId);

    const payload = this.buildGhnFeePayload(dto);
    const providerResponse = await this.calculateGhnFee(payload);
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
      provider: GHN_PROVIDER,
      fee,
      shipping,
      providerResponse,
    };
  }

  async handleWebhook(dto: {
    payload: Record<string, unknown>;
    query: Record<string, unknown>;
    headers: IncomingHttpHeaders;
    rawBody?: Buffer;
  }) {
    this.verifyWebhook(dto);

    const trackingCode = this.extractTrackingCode(dto.payload);
    if (!trackingCode) {
      return { received: true, matched: false };
    }

    const shipping = await this.prisma.shipping.findFirst({
      where: { trackingCode },
    });
    if (!shipping) {
      return { received: true, matched: false };
    }

    const status = this.mapShippingStatus(dto.payload);
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

  private async createGhnOrder(order: SellerOrder, dto: CreateShippingDto) {
    const { baseUrl, token, shopId } = this.getGhnConfig();
    const payload = this.buildGhnCreateOrderPayload(order, dto);

    return this.fetchProvider(`${baseUrl}/shipping-order/create`, {
      method: 'POST',
      headers: this.ghnHeaders(token, shopId),
      body: JSON.stringify(payload),
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

  private async trackGhnOrder(trackingCode: string) {
    const { baseUrl, token, shopId } = this.getGhnConfig();
    return this.fetchProvider(`${baseUrl}/shipping-order/detail`, {
      method: 'POST',
      headers: this.ghnHeaders(token, shopId),
      body: JSON.stringify({ order_code: trackingCode }),
    });
  }

  private async calculateGhnFee(payload: Record<string, unknown>) {
    const { baseUrl, token, shopId } = this.getGhnConfig();
    return this.fetchProvider(`${baseUrl}/shipping-order/fee`, {
      method: 'POST',
      headers: this.ghnHeaders(token, shopId),
      body: JSON.stringify(payload),
    });
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
        user: { select: { name: true, email: true } },
        address: true,
        items: true,
        shipping: true,
      },
    });

    if (!order) throw new ResourceNotFoundException('Order', orderId);
    return order;
  }

  private buildGhnCreateOrderPayload(
    order: SellerOrder,
    dto: CreateShippingDto,
  ) {
    const packageSize = this.getPackageSize(dto);
    const payload = this.stripUndefined({
      payment_type_id: dto.paymentTypeId ?? 2,
      note: dto.note,
      required_note: dto.requiredNote ?? GhnRequiredNote.KHONGCHOXEMHANG,
      client_order_code: order.id,
      to_name: dto.toName ?? order.user?.name,
      to_phone: dto.toPhone,
      to_address: dto.toAddress ?? order.address?.addressLine,
      to_ward_code: dto.toWardCode,
      to_district_id: dto.toDistrictId,
      cod_amount: dto.codAmount ?? 0,
      content: this.buildOrderContent(order),
      ...packageSize,
      insurance_value:
        dto.insuranceValue ??
        Math.min(Math.round(Number(order.totalPrice)), 5000000),
      ...(dto.serviceId
        ? { service_id: dto.serviceId }
        : { service_type_id: dto.serviceTypeId ?? 2 }),
      items: order.items.map((item) => ({
        name: item.productName,
        code: item.sku,
        quantity: item.quantity,
        price: Math.round(Number(item.price)),
        ...packageSize,
      })),
      ...(dto.providerPayload ?? {}),
    });

    this.assertGhnCreateOrderPayload(payload);
    return payload;
  }

  private buildGhnFeePayload(dto: ShippingFeeQueryDto) {
    const payload = {
      ...this.stripUndefined({
        service_id: dto.serviceId,
        ...(dto.serviceId ? {} : { service_type_id: dto.serviceTypeId ?? 2 }),
        to_district_id: dto.toDistrictId,
        to_ward_code: dto.toWardCode,
        weight: dto.weight ?? DEFAULT_GHN_PACKAGE.weight,
        length: dto.length ?? DEFAULT_GHN_PACKAGE.length,
        width: dto.width ?? DEFAULT_GHN_PACKAGE.width,
        height: dto.height ?? DEFAULT_GHN_PACKAGE.height,
        insurance_value: dto.insuranceValue ?? 0,
      }),
      ...this.parseJsonPayload(dto.payload),
    };

    this.assertGhnFeePayload(payload);
    return payload;
  }

  private getPackageSize(
    dto: Pick<CreateShippingDto, 'weight' | 'length' | 'width' | 'height'>,
  ) {
    return {
      weight: dto.weight ?? DEFAULT_GHN_PACKAGE.weight,
      length: dto.length ?? DEFAULT_GHN_PACKAGE.length,
      width: dto.width ?? DEFAULT_GHN_PACKAGE.width,
      height: dto.height ?? DEFAULT_GHN_PACKAGE.height,
    };
  }

  private buildOrderContent(order: SellerOrder) {
    const content = order.items
      .map((item) => item.productName)
      .filter(Boolean)
      .join(', ');
    return content.slice(0, 2000) || `Order ${order.id}`;
  }

  private assertGhnCreateOrderPayload(payload: Record<string, unknown>) {
    this.assertNonEmptyString(payload.to_name, 'toName');
    this.assertNonEmptyString(payload.to_phone, 'toPhone');
    this.assertNonEmptyString(payload.to_address, 'toAddress');
    this.assertNonEmptyString(payload.to_ward_code, 'toWardCode');
    this.assertPositiveNumber(payload.to_district_id, 'toDistrictId');
    this.assertPositiveNumber(payload.weight, 'weight');
    this.assertPositiveNumber(payload.length, 'length');
    this.assertPositiveNumber(payload.width, 'width');
    this.assertPositiveNumber(payload.height, 'height');
    this.assertPositiveNumber(payload.payment_type_id, 'paymentTypeId');
    this.assertNonEmptyString(payload.required_note, 'requiredNote');

    if (!payload.service_id && !payload.service_type_id) {
      throw new BadRequestException('serviceId or serviceTypeId is required');
    }
  }

  private assertGhnFeePayload(payload: Record<string, unknown>) {
    this.assertPositiveNumber(payload.to_district_id, 'toDistrictId');
    this.assertNonEmptyString(payload.to_ward_code, 'toWardCode');
    this.assertPositiveNumber(payload.weight, 'weight');

    if (!payload.service_id && !payload.service_type_id) {
      throw new BadRequestException('serviceId or serviceTypeId is required');
    }
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

  private ghnHeaders(token: string, shopId: string) {
    return {
      'Content-Type': 'application/json',
      Token: token,
      ShopId: shopId,
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
    payload: Record<string, unknown>;
    query: Record<string, unknown>;
    headers: IncomingHttpHeaders;
    rawBody?: Buffer;
  }) {
    this.verifyGhnWebhook(dto.headers, dto.rawBody);
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

  private extractTrackingCode(payload: Record<string, unknown>) {
    const data = this.getRecord(payload.data);

    return (
      this.getString(payload.order_code) ??
      this.getString(payload.OrderCode) ??
      this.getString(payload.trackingCode) ??
      this.getString(data?.order_code) ??
      this.getString(data?.OrderCode)
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

  private mapShippingStatus(payload: Record<string, unknown>) {
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
      status.includes('delivered_complete')
    ) {
      return ShippingStatus.DELIVERED;
    }

    if (
      status.includes('ready') ||
      status.includes('picking') ||
      status.includes('shipping') ||
      status.includes('transport') ||
      status.includes('delivery')
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

  private assertGhnShipping(provider?: string | null) {
    if (provider !== GHN_PROVIDER) {
      throw new BadRequestException('Unsupported shipping provider');
    }
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

  private assertNonEmptyString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${field} is required for GHN shipping`);
    }
  }

  private assertPositiveNumber(value: unknown, field: string) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} is required for GHN shipping`);
    }
  }

  private stripUndefined(value: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, entryValue]) => entryValue !== undefined,
      ),
    );
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
