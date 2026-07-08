export interface SendNotificationInput {
  userId: string;
  email?: string;
  type: string;
  title: string;
  content: string;
  priority?: string;
  channels: string[];
  metadata?: Record<string, any>;
}
