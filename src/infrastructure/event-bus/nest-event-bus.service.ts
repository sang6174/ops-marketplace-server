import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { IEventBus } from './event-bus.interface';

@Injectable()
export class NestEventBus extends EventEmitter implements IEventBus {
  async publish<T>(event: T): Promise<void> {
    const eventName = Object.getPrototypeOf(event).constructor.name;
    this.emit(eventName, event);
  }

  async publishAll<T>(events: T[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
