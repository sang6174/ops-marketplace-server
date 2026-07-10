import { NotificationChannelProvider } from './NotificationChannel';

export class NotificationChannelProviders {
  private constructor(
    private readonly _channels: NotificationChannelProvider[],
  ) {
    if (_channels.length === 0) {
      throw new Error('At least one channel is required');
    }

    const unique = _channels.filter(
      (c, index, self) => self.findIndex((ch) => ch.equals(c)) === index,
    );
    this._channels = unique;
  }

  static create(
    channels: NotificationChannelProvider[],
  ): NotificationChannelProviders {
    return new NotificationChannelProviders(channels);
  }

  static default(): NotificationChannelProviders {
    return new NotificationChannelProviders([
      NotificationChannelProvider.internal(),
    ]);
  }

  get channels(): NotificationChannelProvider[] {
    return [...this._channels];
  }

  hasInternal(): boolean {
    return this._channels.some((c) => c.isInternal());
  }

  equals(other: NotificationChannelProviders): boolean {
    return (
      other instanceof NotificationChannelProviders &&
      this._channels.length === other._channels.length &&
      this._channels.every((c, i) => c.equals(other._channels[i]))
    );
  }
}
