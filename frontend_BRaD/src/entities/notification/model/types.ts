export type NotificationType = 'NEW_APPLICATION' | 'VACANCY_INVITE' | string;

export interface AppNotification {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  payload?: Record<string, unknown>;
  readAt?: string | null;
  createdAt?: string;
}

export interface NotificationsMeta {
  total: number;
  unread: number;
  limit: number;
  offset: number;
}

export interface TelegramSettings {
  telegramChatId: string | null;
  telegramNotificationsEnabled: boolean;
  telegramNotifyInvites: boolean;
  telegramNotifyApplications: boolean;
}

export interface TelegramLinkSession {
  deepLink: string;
  startPayload?: string;
  expiresAt?: string;
  botUsername?: string;
  instructions?: string;
}

export interface NotificationsFilters {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}
