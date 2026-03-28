import { create } from 'zustand';
import api, { getApiErrorMessage } from '@shared/lib/api';
import type {
  AppNotification,
  NotificationsFilters,
  NotificationsMeta,
  TelegramLinkSession,
  TelegramSettings,
} from './types';

interface NotificationsStore {
  items: AppNotification[];
  meta: NotificationsMeta;
  telegramSettings: TelegramSettings;
  telegramLinkSession: TelegramLinkSession | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  loadNotifications: (filters?: NotificationsFilters) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<number>;
  initializeTelegramSettings: (settings?: Partial<TelegramSettings> | null) => void;
  updateTelegramSettings: (settings: Partial<TelegramSettings>) => Promise<void>;
  createTelegramLink: (payload?: {
    telegramNotifyInvites?: boolean;
    telegramNotifyApplications?: boolean;
    expiresInMinutes?: number;
  }) => Promise<TelegramLinkSession>;
}

const defaultMeta: NotificationsMeta = {
  total: 0,
  unread: 0,
  limit: 20,
  offset: 0,
};

const defaultTelegramSettings: TelegramSettings = {
  telegramChatId: null,
  telegramNotificationsEnabled: false,
  telegramNotifyInvites: true,
  telegramNotifyApplications: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const asNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return fallback;
};

const normalizeNotification = (payload: unknown): AppNotification | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const id = asString(payload.id);
  if (!id) {
    return null;
  }

  return {
    id,
    userId: asString(payload.userId) || undefined,
    type: asString(payload.type) || 'NEW_APPLICATION',
    title: asString(payload.title) || 'Notification',
    payload: isRecord(payload.payload) ? payload.payload : undefined,
    readAt:
      payload.readAt === null
        ? null
        : asString(payload.readAt) || undefined,
    createdAt: asString(payload.createdAt) || undefined,
  };
};

const normalizeMeta = (payload: unknown): NotificationsMeta => {
  if (!isRecord(payload) || !isRecord(payload.meta)) {
    return defaultMeta;
  }

  return {
    total: asNumber(payload.meta.total),
    unread: asNumber(payload.meta.unread),
    limit: asNumber(payload.meta.limit) || defaultMeta.limit,
    offset: asNumber(payload.meta.offset),
  };
};

const buildParams = (filters?: NotificationsFilters): Record<string, string | number | boolean> => {
  if (!filters) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  ) as Record<string, string | number | boolean>;
};

const normalizeTelegramSettings = (settings?: Partial<TelegramSettings> | null): TelegramSettings => {
  if (!settings) {
    return defaultTelegramSettings;
  }

  return {
    telegramChatId:
      typeof settings.telegramChatId === 'string' && settings.telegramChatId.trim()
        ? settings.telegramChatId
        : null,
    telegramNotificationsEnabled: asBoolean(
      settings.telegramNotificationsEnabled,
      defaultTelegramSettings.telegramNotificationsEnabled,
    ),
    telegramNotifyInvites: asBoolean(
      settings.telegramNotifyInvites,
      defaultTelegramSettings.telegramNotifyInvites,
    ),
    telegramNotifyApplications: asBoolean(
      settings.telegramNotifyApplications,
      defaultTelegramSettings.telegramNotifyApplications,
    ),
  };
};

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  items: [],
  meta: defaultMeta,
  telegramSettings: defaultTelegramSettings,
  telegramLinkSession: null,
  isLoading: false,
  isMutating: false,
  error: null,

  loadNotifications: async (filters) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/notifications/my', {
        params: buildParams(filters),
      });
      const items =
        isRecord(response.data) && Array.isArray(response.data.items)
          ? response.data.items
              .map((entry) => normalizeNotification(entry))
              .filter((entry): entry is AppNotification => Boolean(entry))
          : [];

      set({
        items,
        meta: normalizeMeta(response.data),
        isLoading: false,
      });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load notifications');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  markAsRead: async (id) => {
    set({ isMutating: true, error: null });

    try {
      await api.patch(`/notifications/${id}/read`);

      set((state) => {
        const target = state.items.find((item) => item.id === id);
        const wasUnread = target ? !target.readAt : false;

        return {
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  readAt: item.readAt || new Date().toISOString(),
                }
              : item,
          ),
          meta: {
            ...state.meta,
            unread: wasUnread ? Math.max(0, state.meta.unread - 1) : state.meta.unread,
          },
          isMutating: false,
        };
      });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to mark notification as read');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  markAllAsRead: async () => {
    set({ isMutating: true, error: null });

    try {
      const response = await api.patch('/notifications/read-all');
      const changed = asNumber(response.data?.changed);

      set((state) => ({
        items: state.items.map((item) => ({
          ...item,
          readAt: item.readAt || new Date().toISOString(),
        })),
        meta: {
          ...state.meta,
          unread: 0,
        },
        isMutating: false,
      }));

      return changed;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to mark notifications as read');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  initializeTelegramSettings: (settings) => {
    set((state) => ({
      telegramSettings: normalizeTelegramSettings({
        ...state.telegramSettings,
        ...settings,
      }),
    }));
  },

  updateTelegramSettings: async (settings) => {
    set({ isMutating: true, error: null });

    try {
      const payload = Object.fromEntries(
        Object.entries({
          telegramChatId: settings.telegramChatId,
          telegramNotificationsEnabled: settings.telegramNotificationsEnabled,
          telegramNotifyInvites: settings.telegramNotifyInvites,
          telegramNotifyApplications: settings.telegramNotifyApplications,
        }).filter(([, value]) => value !== undefined),
      );

      const response = await api.patch('/notifications/telegram', payload);
      const responsePayload = isRecord(response.data) ? response.data : {};

      set((state) => ({
        telegramSettings: normalizeTelegramSettings({
          ...state.telegramSettings,
          ...settings,
          telegramChatId:
            asString(responsePayload.telegramChatId) ||
            settings.telegramChatId ||
            state.telegramSettings.telegramChatId,
          telegramNotificationsEnabled:
            asBoolean(
              responsePayload.telegramNotificationsEnabled,
              settings.telegramNotificationsEnabled ??
                state.telegramSettings.telegramNotificationsEnabled,
            ),
          telegramNotifyInvites:
            asBoolean(
              responsePayload.telegramNotifyInvites,
              settings.telegramNotifyInvites ??
                state.telegramSettings.telegramNotifyInvites,
            ),
          telegramNotifyApplications:
            asBoolean(
              responsePayload.telegramNotifyApplications,
              settings.telegramNotifyApplications ??
                state.telegramSettings.telegramNotifyApplications,
            ),
        }),
        isMutating: false,
      }));
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to update Telegram settings');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  createTelegramLink: async (payload) => {
    set({ isMutating: true, error: null });

    try {
      const response = await api.post('/notifications/telegram/link', payload || {});
      const session: TelegramLinkSession = {
        deepLink: asString(response.data?.deepLink),
        startPayload: asString(response.data?.startPayload) || undefined,
        expiresAt: asString(response.data?.expiresAt) || undefined,
        botUsername: asString(response.data?.botUsername) || undefined,
        instructions: asString(response.data?.instructions) || undefined,
      };

      set({
        telegramLinkSession: session,
        isMutating: false,
      });

      return session;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to create Telegram link');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },
}));
