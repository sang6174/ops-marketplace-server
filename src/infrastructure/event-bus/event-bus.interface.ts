export interface IEventBus {
  publish<T>(event: T): Promise<void>;
  publishAll<T>(events: T[]): Promise<void>;
}

export interface IEventPublisher {
  publish<T>(event: T): Promise<void>;
}

export interface IEventHandler<T> {
  handle(event: T): Promise<void>;
}
