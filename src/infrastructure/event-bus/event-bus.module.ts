import { Module, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, DiscoveryModule } from '@nestjs/core';
import { NestEventBus } from './nest-event-bus.service';
import { EVENT_BUS } from './event-bus.constants';
import {
  DOMAIN_EVENT_HANDLER_METADATA,
  DomainEventHandlerMetadata,
} from './event-bus.decorator';

@Module({
  imports: [DiscoveryModule],
  providers: [
    NestEventBus,
    { provide: EVENT_BUS, useExisting: NestEventBus },
  ],
  exports: [NestEventBus, EVENT_BUS],
})
export class EventBusModule implements OnModuleInit {
  constructor(
    private readonly eventBus: NestEventBus,
    private readonly discoveryService: DiscoveryService,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();
    for (const wrapper of providers) {
      const { instance } = wrapper;
      if (!instance) continue;

      const prototype = Object.getPrototypeOf(instance);
      const handlers: DomainEventHandlerMetadata[] =
        Reflect.getMetadata(DOMAIN_EVENT_HANDLER_METADATA, prototype) ?? [];

      for (const { eventClass, handlerName } of handlers) {
        const handlerMethod = (instance as Record<string, unknown>)[handlerName];
        if (typeof handlerMethod === 'function') {
          this.eventBus.on(eventClass.name, (event: unknown) =>
            (handlerMethod as (e: unknown) => Promise<void>)(event),
          );
        }
      }
    }
  }
}
