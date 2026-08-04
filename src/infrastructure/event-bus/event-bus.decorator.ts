import 'reflect-metadata';

export const DOMAIN_EVENT_HANDLER_METADATA = 'DOMAIN_EVENT_HANDLER';

export interface DomainEventHandlerMetadata {
  eventClass: new (...args: any[]) => any;
  handlerName: string;
}

export function OnDomainEvent(
  eventClass: new (...args: any[]) => any,
): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    const handlers: DomainEventHandlerMetadata[] =
      Reflect.getMetadata(DOMAIN_EVENT_HANDLER_METADATA, target) ?? [];
    handlers.push({ eventClass, handlerName: propertyKey as string });
    Reflect.defineMetadata(DOMAIN_EVENT_HANDLER_METADATA, handlers, target);
  };
}
