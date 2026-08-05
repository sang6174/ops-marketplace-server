import { Injectable, Logger } from '@nestjs/common';
import { OnDomainEvent } from '../event-bus.decorator';
import {
  PaymentCreated,
  PaymentSucceeded,
  PaymentFailed,
  PaymentRefunded,
} from '@domain/events/PaymentEvents';

@Injectable()
export class PaymentEventsHandler {
  private readonly logger = new Logger(PaymentEventsHandler.name);

  @OnDomainEvent(PaymentCreated)
  async handlePaymentCreated(event: PaymentCreated) {
    this.logger.log(`Payment created: ${event.paymentId}`);
  }

  @OnDomainEvent(PaymentSucceeded)
  async handlePaymentSucceeded(event: PaymentSucceeded) {
    this.logger.log(`Payment succeeded: ${event.paymentId}`);
  }

  @OnDomainEvent(PaymentFailed)
  async handlePaymentFailed(event: PaymentFailed) {
    this.logger.log(`Payment failed: ${event.paymentId}`);
  }

  @OnDomainEvent(PaymentRefunded)
  async handlePaymentRefunded(event: PaymentRefunded) {
    this.logger.log(`Payment refunded: ${event.paymentId}`);
  }
}
