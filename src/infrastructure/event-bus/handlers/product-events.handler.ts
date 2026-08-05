import { Injectable, Logger } from '@nestjs/common';
import { OnDomainEvent } from '../event-bus.decorator';
import {
  ProductPublishedEvent,
  ProductConfirmedEvent,
  ProductUnpublishedEvent,
} from '@domain/events/ProductEvents';

@Injectable()
export class ProductEventsHandler {
  private readonly logger = new Logger(ProductEventsHandler.name);

  @OnDomainEvent(ProductPublishedEvent)
  async handleProductPublished(event: ProductPublishedEvent) {
    this.logger.log(`Product published: ${event.productId}`);
  }

  @OnDomainEvent(ProductConfirmedEvent)
  async handleProductConfirmed(event: ProductConfirmedEvent) {
    this.logger.log(`Product confirmed: ${event.productId}`);
  }

  @OnDomainEvent(ProductUnpublishedEvent)
  async handleProductUnpublished(event: ProductUnpublishedEvent) {
    this.logger.log(`Product unpublished: ${event.productId}`);
  }
}
