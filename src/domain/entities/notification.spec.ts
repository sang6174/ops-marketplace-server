// domain/entities/notification.spec.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Notification } from './notification';
import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from './enums.enum';

describe('Notification Domain Entity', () => {
  let notification: Notification;

  beforeEach(() => {
    notification = Notification.create({
      userId: 'user-123',
      type: NotificationType.ORDER,
      title: 'Order confirmed',
      content: 'Your order #12345 has been confirmed.',
      priority: NotificationPriority.HIGH,
      channels: ['internal', 'email'],
      metadata: { orderId: '12345' },
    });
  });

  describe('create', () => {
    it('should create a notification with required fields and default values', () => {
      const notif = Notification.create({
        userId: 'user-456',
        type: NotificationType.PAYMENT,
        title: 'Payment successful',
        content: 'Payment of 100,000 VND was successful.',
      });

      expect(notif.id).toBeDefined();
      expect(notif.userId).toBe('user-456');
      expect(notif.type).toBe(NotificationType.PAYMENT);
      expect(notif.title).toBe('Payment successful');
      expect(notif.content).toBe('Payment of 100,000 VND was successful.');
      expect(notif.status).toBe(NotificationStatus.PENDING);
      expect(notif.priority).toBe(NotificationPriority.NORMAL);
      expect(notif.sentAt).toBeNull();
      expect(notif.readAt).toBeNull();
      expect(notif.metadata).toBeNull();
      expect(notif.channels).toEqual(['internal']);
      expect(notif.createdAt).toBeInstanceOf(Date);
    });

    it('should accept optional channels, priority, and metadata', () => {
      const notif = Notification.create({
        userId: 'user-789',
        type: NotificationType.SYSTEM,
        title: 'System maintenance',
        content: 'System will undergo maintenance at 2 AM.',
        priority: NotificationPriority.LOW,
        channels: ['internal', 'email', 'sms'],
        metadata: { maintenanceTime: '02:00' },
      });

      expect(notif.channels).toEqual(['internal', 'email', 'sms']);
      expect(notif.metadata).toEqual({ maintenanceTime: '02:00' });
      expect(notif.priority).toBe(NotificationPriority.LOW);
    });

    it('should generate unique IDs for different notifications', () => {
      const n1 = Notification.create({
        userId: 'u1',
        type: NotificationType.SYSTEM,
        title: 't1',
        content: 'c1',
      });
      const n2 = Notification.create({
        userId: 'u2',
        type: NotificationType.SYSTEM,
        title: 't2',
        content: 'c2',
      });
      expect(n1.id).not.toBe(n2.id);
    });
  });

  describe('getters', () => {
    it('should return correct property values', () => {
      expect(notification.userId).toBe('user-123');
      expect(notification.type).toBe(NotificationType.ORDER);
      expect(notification.title).toBe('Order confirmed');
      expect(notification.content).toBe(
        'Your order #12345 has been confirmed.',
      );
      expect(notification.status).toBe(NotificationStatus.PENDING);
      expect(notification.priority).toBe(NotificationPriority.HIGH);
      expect(notification.sentAt).toBeNull();
      expect(notification.readAt).toBeNull();
      expect(notification.metadata).toEqual({ orderId: '12345' });
      expect(notification.channels).toEqual(['internal', 'email']);
    });
  });

  describe('markAsSent', () => {
    it('should set status to SENT and record sent timestamp', () => {
      expect(notification.status).toBe(NotificationStatus.PENDING);
      expect(notification.sentAt).toBeNull();

      notification.markAsSent();

      expect(notification.status).toBe(NotificationStatus.SENT);
      expect(notification.sentAt).toBeInstanceOf(Date);
    });

    it('should not change status if already SENT', () => {
      notification.markAsSent();
      const firstSentAt = notification.sentAt;
      notification.markAsSent();
      expect(notification.status).toBe(NotificationStatus.SENT);
      expect(notification.sentAt).toEqual(firstSentAt);
    });
  });

  describe('markAsFailed', () => {
    it('should set status to FAILED', () => {
      expect(notification.status).toBe(NotificationStatus.PENDING);
      notification.markAsFailed();
      expect(notification.status).toBe(NotificationStatus.FAILED);
    });

    it('should override previous status (even SENT)', () => {
      notification.markAsSent();
      expect(notification.status).toBe(NotificationStatus.SENT);
      notification.markAsFailed();
      expect(notification.status).toBe(NotificationStatus.FAILED);
    });
  });

  describe('markAsRead', () => {
    it('should mark internal notification as READ with timestamp', () => {
      const internalNotif = Notification.create({
        userId: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'Internal',
        content: 'Only internal',
        channels: ['internal'],
      });
      expect(internalNotif.status).toBe(NotificationStatus.PENDING);
      expect(internalNotif.readAt).toBeNull();

      internalNotif.markAsRead();

      expect(internalNotif.status).toBe(NotificationStatus.READ);
      expect(internalNotif.readAt).toBeInstanceOf(Date);
    });

    it('should throw if notification does not include "internal" channel', () => {
      const emailOnlyNotif = Notification.create({
        userId: 'user-2',
        type: NotificationType.SYSTEM,
        title: 'Email only',
        content: 'Only email',
        channels: ['email'],
      });
      expect(() => emailOnlyNotif.markAsRead()).toThrow(
        'Only internal notifications can be marked as read',
      );
    });

    it('should not change status if already READ', () => {
      const internalNotif = Notification.create({
        userId: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'Internal',
        content: 'Only internal',
        channels: ['internal'],
      });
      internalNotif.markAsRead();
      const firstReadAt = internalNotif.readAt;
      internalNotif.markAsRead();
      expect(internalNotif.status).toBe(NotificationStatus.READ);
      expect(internalNotif.readAt).toEqual(firstReadAt);
    });
  });

  describe('isDelivered', () => {
    it('should return false when PENDING', () => {
      expect(notification.isDelivered()).toBe(false);
    });

    it('should return true when SENT', () => {
      notification.markAsSent();
      expect(notification.isDelivered()).toBe(true);
    });

    it('should return true when READ', () => {
      const internalNotif = Notification.create({
        userId: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'Internal',
        content: 'Only internal',
        channels: ['internal'],
      });
      internalNotif.markAsRead();
      expect(internalNotif.isDelivered()).toBe(true);
    });

    it('should return false when FAILED', () => {
      notification.markAsFailed();
      expect(notification.isDelivered()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same instance', () => {
      expect(notification.equals(notification)).toBe(true);
    });

    it('should return false for different notification', () => {
      const other = Notification.create({
        userId: 'user-999',
        type: NotificationType.PAYMENT,
        title: 'Other',
        content: 'Other content',
      });
      expect(notification.equals(other)).toBe(false);
    });

    it('should return false for non-Notification objects', () => {
      expect(notification.equals(null as any)).toBe(false);
      expect(notification.equals({} as any)).toBe(false);
      expect(notification.equals(undefined as any)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should allow empty title and content', () => {
      const notif = Notification.create({
        userId: 'user-1',
        type: NotificationType.SYSTEM,
        title: '',
        content: '',
      });
      expect(notif.title).toBe('');
      expect(notif.content).toBe('');
    });

    it('should handle very long content', () => {
      const longContent = 'a'.repeat(10000);
      const notif = Notification.create({
        userId: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'Long',
        content: longContent,
      });
      expect(notif.content).toBe(longContent);
    });

    it('should support complex metadata', () => {
      const notif = Notification.create({
        userId: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'Complex metadata',
        content: 'Test',
        metadata: { nested: { deep: { value: 42 } }, array: [1, 2, 3] },
      });
      expect(notif.metadata).toEqual({
        nested: { deep: { value: 42 } },
        array: [1, 2, 3],
      });
    });

    it('should support all notification types', () => {
      const types = [
        NotificationType.ORDER,
        NotificationType.PAYMENT,
        NotificationType.PRODUCT,
        NotificationType.SYSTEM,
      ];
      for (const type of types) {
        const notif = Notification.create({
          userId: 'user-1',
          type,
          title: 'Test',
          content: 'Test',
        });
        expect(notif.type).toBe(type);
      }
    });
  });
});
