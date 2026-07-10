import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Notification } from '../notifies/Notification';
import { NotificationId } from '../../value-objects/NotificationId';
import { UserId } from '../../value-objects/UserId';
import { NotificationType } from '../enums.enum';
import { NotificationTitle } from '../../value-objects/NotificationTitle';
import { NotificationContent } from '../../value-objects/NotificationContent';
import { NotificationPriorityState } from '../../value-objects/NotificationPriority';
import { NotificationState } from '../../value-objects/NotificationState';
import { NotificationChannelProvider } from '../../value-objects/NotificationChannel';
import { NotificationChannelProviders } from '../../value-objects/NotificationChannels';
import { NotificationMetadata } from '../../value-objects/NotificationMetadata';
import {
  NotificationCreated,
  NotificationSent,
  NotificationRead,
  NotificationFailed,
} from '../../events/NotificationEvents';

describe('Notification Aggregate', () => {
  let notification: Notification;
  const fixedId = NotificationId.generate();
  const fixedUserId = UserId.generate();
  const fixedType = NotificationType.ORDER_STATUS_UPDATE;
  const fixedTitle = NotificationTitle.create('Order Shipped');
  const fixedContent = NotificationContent.create(
    'Your order has been shipped',
  );
  const fixedPriority = NotificationPriorityState.normal();
  const fixedChannels = NotificationChannelProviders.default();
  const fixedMetadata = NotificationMetadata.create({ orderId: '123' });
  const fixedDate = new Date('2025-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
    jest
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('017fe537-bb13-7c35-b52a-cb5490cce7be');

    notification = Notification.create({
      id: fixedId,
      userId: fixedUserId,
      type: fixedType,
      title: fixedTitle,
      content: fixedContent,
      priority: fixedPriority,
      channels: fixedChannels,
      metadata: fixedMetadata,
      createdAt: fixedDate,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('create()', () => {
    it('should create notification with PENDING status', () => {
      expect(notification.id).toBe(fixedId);
      expect(notification.userId).toBe(fixedUserId);
      expect(notification.type).toBe(fixedType);
      expect(notification.title).toBe(fixedTitle);
      expect(notification.content).toBe(fixedContent);
      expect(notification.priority).toBe(fixedPriority);
      expect(notification.channels).toBe(fixedChannels);
      expect(notification.metadata).toBe(fixedMetadata);
      expect(notification.status).toEqual(NotificationState.pending());
      expect(notification.sentAt).toBeNull();
      expect(notification.readAt).toBeNull();
      expect(notification.createdAt).toBe(fixedDate);
      expect(notification.updatedAt).toBe(fixedDate);
      expect(notification.events).toHaveLength(1);
      expect(notification.events[0]).toBeInstanceOf(NotificationCreated);
    });

    it('should use default priority, channels, metadata if not provided', () => {
      const n = Notification.create({
        id: NotificationId.generate(),
        userId: fixedUserId,
        type: NotificationType.PROMOTION,
        title: NotificationTitle.create('Promo'),
        content: NotificationContent.create('Content'),
      });
      expect(n.priority).toEqual(NotificationPriorityState.normal());
      expect(n.channels).toEqual(NotificationChannelProviders.default());
      expect(n.metadata).toEqual(NotificationMetadata.create());
    });
  });

  describe('reconstitute()', () => {
    it('should recreate notification from persistence', () => {
      const reconstituted = Notification.reconstitute({
        id: fixedId,
        userId: fixedUserId,
        type: NotificationType.ORDER_STATUS_UPDATE,
        title: fixedTitle,
        content: fixedContent,
        priority: NotificationPriorityState.high(),
        status: NotificationState.sent(),
        channels: NotificationChannelProviders.create([
          NotificationChannelProvider.fromString('email'),
          NotificationChannelProvider.fromString('internal'),
        ]),
        metadata: NotificationMetadata.create({ key: 'value' }),
        createdAt: fixedDate,
        updatedAt: new Date('2025-02-01'),
        sentAt: new Date('2025-01-02'),
        readAt: null,
      });

      expect(reconstituted.id).toBe(fixedId);
      expect(reconstituted.status).toEqual(NotificationState.sent());
      expect(reconstituted.sentAt).toEqual(new Date('2025-01-02'));
      expect(reconstituted.updatedAt).toEqual(new Date('2025-02-01'));
      expect(reconstituted.events).toHaveLength(0);
    });
  });

  describe('markAsSent()', () => {
    it('should transition from PENDING to SENT', () => {
      const sentTime = new Date('2025-02-01');
      jest.setSystemTime(sentTime);

      notification.markAsSent();

      expect(notification.status).toEqual(NotificationState.sent());
      expect(notification.sentAt).toEqual(sentTime);
      expect(notification.updatedAt).toEqual(sentTime);
      expect(notification.events).toHaveLength(2);
      expect(notification.events[1]).toBeInstanceOf(NotificationSent);
    });

    it('should throw if already SENT', () => {
      notification.markAsSent();
      expect(() => notification.markAsSent()).toThrow(
        'Cannot send from state SENT',
      );
    });

    it('should throw if already READ', () => {
      notification.markAsSent();
      notification.markAsRead();
      expect(() => notification.markAsSent()).toThrow(
        'Cannot send from state READ',
      );
    });

    it('should allow retry from FAILED', () => {
      notification.markAsFailed('Error');
      notification.markAsSent();
      expect(notification.status).toEqual(NotificationState.sent());
    });
  });

  describe('markAsRead()', () => {
    it('should transition from SENT to READ', () => {
      const readTime = new Date('2025-02-01');
      jest.setSystemTime(readTime);

      notification.markAsSent();
      notification.markAsRead();

      expect(notification.status).toEqual(NotificationState.read());
      expect(notification.readAt).toEqual(readTime);
      expect(notification.updatedAt).toEqual(readTime);
      expect(notification.events).toHaveLength(3);
      expect(notification.events[2]).toBeInstanceOf(NotificationRead);
    });

    it('should throw if not SENT', () => {
      expect(() => notification.markAsRead()).toThrow(
        'Cannot read from state PENDING',
      );
    });

    it('should throw if already READ', () => {
      notification.markAsSent();
      notification.markAsRead();
      expect(() => notification.markAsRead()).toThrow(
        'Cannot read from state READ',
      );
    });

    it('should throw if channels do not include internal', () => {
      const n = Notification.create({
        id: NotificationId.generate(),
        userId: fixedUserId,
        type: NotificationType.ORDER_STATUS_UPDATE,
        title: NotificationTitle.create('Test'),
        content: NotificationContent.create('Content'),
        channels: NotificationChannelProviders.create([
          NotificationChannelProvider.fromString('email'),
        ]),
      });
      n.markAsSent();
      expect(() => n.markAsRead()).toThrow(
        'Only internal notifications can be marked as read',
      );
    });

    it('should allow read for internal channel', () => {
      const n = Notification.create({
        id: NotificationId.generate(),
        userId: fixedUserId,
        type: NotificationType.ORDER_STATUS_UPDATE,
        title: NotificationTitle.create('Test'),
        content: NotificationContent.create('Content'),
        channels: NotificationChannelProviders.create([
          NotificationChannelProvider.fromString('internal'),
        ]),
      });
      n.markAsSent();
      n.markAsRead();
      expect(n.status).toEqual(NotificationState.read());
    });
  });

  describe('markAsFailed()', () => {
    it('should transition from PENDING to FAILED', () => {
      const failTime = new Date('2025-02-01');
      jest.setSystemTime(failTime);

      notification.markAsFailed('Network error');

      expect(notification.status).toEqual(NotificationState.failed());
      expect(notification.updatedAt).toEqual(failTime);
      expect(notification.events).toHaveLength(2);
      expect(notification.events[1]).toBeInstanceOf(NotificationFailed);
      expect(notification.events[1].reason).toBe('Network error');
    });

    it('should transition from SENT to FAILED', () => {
      notification.markAsSent();
      notification.markAsFailed('Delivery error');
      expect(notification.status).toEqual(NotificationState.failed());
    });

    it('should allow reason to be optional', () => {
      notification.markAsFailed();
      expect(notification.events[1].reason).toBeUndefined();
    });

    it('should throw if already READ', () => {
      notification.markAsSent();
      notification.markAsRead();
      expect(() => notification.markAsFailed()).toThrow(
        'Cannot fail from state READ',
      );
    });

    it('should allow retry from FAILED to PENDING via state pattern', () => {
      notification.markAsFailed('Error');
      notification.setState(NotificationState.pending());
      expect(notification.status).toEqual(NotificationState.pending());
    });
  });

  describe('isDelivered()', () => {
    it('should return false for PENDING', () => {
      expect(notification.isDelivered()).toBe(false);
    });

    it('should return true for SENT', () => {
      notification.markAsSent();
      expect(notification.isDelivered()).toBe(true);
    });

    it('should return true for READ', () => {
      notification.markAsSent();
      notification.markAsRead();
      expect(notification.isDelivered()).toBe(true);
    });

    it('should return false for FAILED', () => {
      notification.markAsFailed('Error');
      expect(notification.isDelivered()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('should return true for same id', () => {
      expect(notification.equals(notification)).toBe(true);
    });

    it('should return false for different id', () => {
      const other = Notification.create({
        id: NotificationId.generate(),
        userId: fixedUserId,
        type: NotificationType.PROMOTION,
        title: NotificationTitle.create('Other'),
        content: NotificationContent.create('Other'),
      });
      expect(notification.equals(other)).toBe(false);
    });
  });

  describe('clearEvents()', () => {
    it('should clear all events', () => {
      expect(notification.events).toHaveLength(1);
      notification.clearEvents();
      expect(notification.events).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle full lifecycle: PENDING -> SENT -> READ', () => {
      notification.markAsSent();
      expect(notification.status).toEqual(NotificationState.sent());

      notification.markAsRead();
      expect(notification.status).toEqual(NotificationState.read());
      expect(notification.readAt).toBeDefined();
    });

    it('should handle failure flow: PENDING -> FAILED -> SENT', () => {
      notification.markAsFailed('Error');
      expect(notification.status).toEqual(NotificationState.failed());

      notification.setState(NotificationState.pending());
      expect(notification.status).toEqual(NotificationState.pending());

      notification.markAsSent();
      expect(notification.status).toEqual(NotificationState.sent());
    });

    it('should update updatedAt on every change', () => {
      const initial = notification.updatedAt;

      const sentTime = new Date('2025-02-01');
      jest.setSystemTime(sentTime);
      notification.markAsSent();
      expect(notification.updatedAt).not.toBe(initial);
      expect(notification.updatedAt).toEqual(sentTime);
    });
  });
});
