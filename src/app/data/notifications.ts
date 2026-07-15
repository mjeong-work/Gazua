export type NotificationType = 'creator_post' | 'price_alert' | 'model_update' | 'system';

export interface Notification {
  id: number;
  user_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export const MOCK_NOTIFICATIONS: Notification[] = [];
