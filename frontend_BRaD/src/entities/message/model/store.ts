import { create } from 'zustand';
import api, { getApiBaseUrl, getApiErrorMessage, getStoredAccessToken } from '@shared/lib/api';
import { useUserStore } from '@entities/user';
import type {
  ChatDetails,
  ChatFilters,
  ChatListMeta,
  ChatMessage,
  ChatMessageCreatedEvent,
  ChatReadEvent,
  ChatSummary,
  ChatUserPreview,
} from './types';

interface ChatStore {
  chats: ChatSummary[];
  meta: ChatListMeta;
  activeChatId: string | null;
  detailsById: Record<string, ChatDetails>;
  messagesByChatId: Record<string, ChatMessage[]>;
  messagesMetaByChatId: Record<string, ChatListMeta>;
  isLoadingList: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  streamStatus: 'idle' | 'connecting' | 'connected' | 'error';
  error: string | null;
  setActiveChat: (chatId: string | null) => void;
  listChats: (filters?: ChatFilters) => Promise<void>;
  loadChat: (chatId: string) => Promise<ChatDetails>;
  loadChatByApplication: (applicationId: string) => Promise<ChatDetails>;
  loadMessages: (chatId: string, limit?: number, offset?: number) => Promise<void>;
  sendMessage: (chatId: string, text: string) => Promise<ChatMessage>;
  markRead: (chatId: string) => Promise<void>;
  connectStream: () => void;
  disconnectStream: () => void;
  getOtherParticipant: (chat: ChatSummary | ChatDetails | null | undefined) => ChatUserPreview | null;
}

const defaultMeta: ChatListMeta = {
  total: 0,
  limit: 20,
  offset: 0,
};

let stream: EventSource | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() ? value : undefined;
};

const asNullableString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null;
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeUser = (value: unknown): ChatUserPreview | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  const email = asString(value.email);

  if (!id || !email) {
    return null;
  }

  return {
    id,
    email,
    role: asString(value.role),
    firstName: asString(value.firstName),
    lastName: asString(value.lastName),
    phone: asString(value.phone),
  };
};

const normalizeMessage = (value: unknown, fallbackChatId?: string): ChatMessage | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  const createdAt = asString(value.createdAt);
  const text = typeof value.text === 'string' ? value.text : '';
  const type = asString(value.type);

  if (!id || !createdAt || !type) {
    return null;
  }

  return {
    id,
    chatId: asString(value.chatId) || fallbackChatId || '',
    senderId: asNullableString(value.senderId),
    type: type as ChatMessage['type'],
    text,
    createdAt,
    meta: isRecord(value.meta) ? value.meta : null,
    sender: normalizeUser(value.sender),
  };
};

const normalizeChat = (value: unknown): ChatDetails | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  const applicationId = asString(value.applicationId);
  const vacancyId = asString(value.vacancyId);
  const candidateId = asString(value.candidateId);
  const hrUserId = asString(value.hrUserId);

  if (!id || !applicationId || !vacancyId || !candidateId || !hrUserId) {
    return null;
  }

  const vacancy = isRecord(value.vacancy)
    ? {
        id: asString(value.vacancy.id) || vacancyId,
        title: asString(value.vacancy.title) || 'Untitled vacancy',
        status: asString(value.vacancy.status),
        company: isRecord(value.vacancy.company)
          ? {
              id: asString(value.vacancy.company.id) || '',
              name: asString(value.vacancy.company.name) || 'Company',
            }
          : null,
      }
    : null;

  const application = isRecord(value.application)
    ? {
        id: asString(value.application.id) || applicationId,
        status: asString(value.application.status),
        coverLetter:
          typeof value.application.coverLetter === 'string'
            ? value.application.coverLetter
            : null,
        createdAt: asString(value.application.createdAt),
        updatedAt: asString(value.application.updatedAt),
      }
    : null;

  return {
    id,
    applicationId,
    vacancyId,
    candidateId,
    hrUserId,
    lastMessageAt: asNullableString(value.lastMessageAt),
    candidateLastReadAt: asNullableString(value.candidateLastReadAt),
    hrLastReadAt: asNullableString(value.hrLastReadAt),
    unreadCount: asNumber(value.unreadCount, 0),
    vacancy,
    application,
    candidate: normalizeUser(value.candidate),
    hrUser: normalizeUser(value.hrUser),
    lastMessage: normalizeMessage(value.lastMessage, id),
    createdAt: asString(value.createdAt),
    updatedAt: asString(value.updatedAt),
  };
};

const normalizeMeta = (value: unknown): ChatListMeta => {
  if (!isRecord(value)) {
    return defaultMeta;
  }

  return {
    total: asNumber(value.total, 0),
    limit: asNumber(value.limit, 20),
    offset: asNumber(value.offset, 0),
  };
};

const mergeChats = (
  existing: ChatSummary[],
  incoming: ChatSummary[],
): ChatSummary[] => {
  const map = new Map<string, ChatSummary>();

  existing.forEach((chat) => {
    map.set(chat.id, chat);
  });

  incoming.forEach((chat) => {
    const prev = map.get(chat.id);
    map.set(chat.id, prev ? { ...prev, ...chat } : chat);
  });

  return Array.from(map.values()).sort((left, right) => {
    const leftTime = new Date(left.lastMessageAt || 0).getTime();
    const rightTime = new Date(right.lastMessageAt || 0).getTime();
    return rightTime - leftTime;
  });
};

const upsertMessage = (messages: ChatMessage[], incoming: ChatMessage): ChatMessage[] => {
  const next = messages.some((message) => message.id === incoming.id)
    ? messages.map((message) => (message.id === incoming.id ? { ...message, ...incoming } : message))
    : [...messages, incoming];

  return next.sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
};

const applyMessageToChat = (
  chats: ChatSummary[],
  chatId: string,
  message: ChatMessage,
  currentUserId?: string,
  openedChatId?: string | null,
): ChatSummary[] => {
  return mergeChats(
    chats.map((chat) => {
      if (chat.id !== chatId) {
        return chat;
      }

      const shouldIncrementUnread =
        message.senderId &&
        message.senderId !== currentUserId &&
        openedChatId !== chatId;

      return {
        ...chat,
        lastMessage: message,
        lastMessageAt: message.createdAt,
        unreadCount: shouldIncrementUnread ? chat.unreadCount + 1 : chat.unreadCount,
      };
    }),
    [],
  );
};

export const useMessageStore = create<ChatStore>((set, get) => ({
  chats: [],
  meta: defaultMeta,
  activeChatId: null,
  detailsById: {},
  messagesByChatId: {},
  messagesMetaByChatId: {},
  isLoadingList: false,
  isLoadingMessages: false,
  isSending: false,
  streamStatus: 'idle',
  error: null,

  setActiveChat: (chatId) => {
    set({ activeChatId: chatId });
  },

  listChats: async (filters) => {
    set({ isLoadingList: true, error: null });

    try {
      const response = await api.get('/chats/my', {
        params: filters,
      });
      const items = Array.isArray(response.data?.items)
        ? response.data.items
            .map((entry: unknown) => normalizeChat(entry))
            .filter((entry: ChatDetails | null): entry is ChatDetails => Boolean(entry))
        : [];

      set((state) => ({
        chats: mergeChats(state.chats, items),
        detailsById: {
          ...state.detailsById,
          ...Object.fromEntries(items.map((chat: ChatDetails) => [chat.id, chat])),
        },
        meta: normalizeMeta(response.data?.meta),
        isLoadingList: false,
      }));
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load chats');
      set({ isLoadingList: false, error: message });
      throw new Error(message);
    }
  },

  loadChat: async (chatId) => {
    try {
      const response = await api.get(`/chats/${chatId}`);
      const chat = normalizeChat(response.data);

      if (!chat) {
        throw new Error('Chat payload is invalid');
      }

      set((state) => ({
        chats: mergeChats(state.chats, [chat]),
        detailsById: {
          ...state.detailsById,
          [chat.id]: chat,
        },
      }));

      return chat;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load chat');
      set({ error: message });
      throw new Error(message);
    }
  },

  loadChatByApplication: async (applicationId) => {
    try {
      const response = await api.get(`/chats/application/${applicationId}`);
      const chat = normalizeChat(response.data);

      if (!chat) {
        throw new Error('Chat payload is invalid');
      }

      set((state) => ({
        chats: mergeChats(state.chats, [chat]),
        detailsById: {
          ...state.detailsById,
          [chat.id]: chat,
        },
      }));

      return chat;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to open chat');
      set({ error: message });
      throw new Error(message);
    }
  },

  loadMessages: async (chatId, limit = 50, offset = 0) => {
    set({ isLoadingMessages: true, error: null });

    try {
      const response = await api.get(`/chats/${chatId}/messages`, {
        params: { limit, offset },
      });

      const items = Array.isArray(response.data?.items)
        ? response.data.items
            .map((entry: unknown) => normalizeMessage(entry, chatId))
            .filter((entry: ChatMessage | null): entry is ChatMessage => Boolean(entry))
        : [];

      set((state) => ({
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: items,
        },
        messagesMetaByChatId: {
          ...state.messagesMetaByChatId,
          [chatId]: normalizeMeta(response.data?.meta),
        },
        isLoadingMessages: false,
      }));
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load messages');
      set({ isLoadingMessages: false, error: message });
      throw new Error(message);
    }
  },

  sendMessage: async (chatId, text) => {
    set({ isSending: true, error: null });

    try {
      const response = await api.post(`/chats/${chatId}/messages`, {
        text: text.trim(),
      });

      const message = normalizeMessage(response.data, chatId);
      if (!message) {
        throw new Error('Message payload is invalid');
      }

      set((state) => ({
        isSending: false,
        messagesByChatId: {
          ...state.messagesByChatId,
          [chatId]: upsertMessage(state.messagesByChatId[chatId] || [], message),
        },
        chats: applyMessageToChat(
          state.chats,
          chatId,
          message,
          useUserStore.getState().currentUser?.id,
          state.activeChatId,
        ),
        detailsById: state.detailsById[chatId]
          ? {
              ...state.detailsById,
              [chatId]: {
                ...state.detailsById[chatId],
                lastMessage: message,
                lastMessageAt: message.createdAt,
              },
            }
          : state.detailsById,
      }));

      return message;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to send message');
      set({ isSending: false, error: message });
      throw new Error(message);
    }
  },

  markRead: async (chatId) => {
    try {
      const response = await api.patch(`/chats/${chatId}/read`);
      const readAt = asString(response.data?.readAt) || new Date().toISOString();
      const currentUser = useUserStore.getState().currentUser;
      const isCandidate = currentUser?.role === 'candidate';

      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                unreadCount: 0,
                candidateLastReadAt: isCandidate ? readAt : chat.candidateLastReadAt,
                hrLastReadAt: isCandidate ? chat.hrLastReadAt : readAt,
              }
            : chat,
        ),
        detailsById: state.detailsById[chatId]
          ? {
              ...state.detailsById,
              [chatId]: {
                ...state.detailsById[chatId],
                unreadCount: 0,
                candidateLastReadAt: isCandidate
                  ? readAt
                  : state.detailsById[chatId].candidateLastReadAt,
                hrLastReadAt: isCandidate ? state.detailsById[chatId].hrLastReadAt : readAt,
              },
            }
          : state.detailsById,
      }));
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to mark chat as read');
      set({ error: message });
      throw new Error(message);
    }
  },

  connectStream: () => {
    if (typeof window === 'undefined' || stream) {
      return;
    }

    const accessToken = getStoredAccessToken();
    if (!accessToken) {
      return;
    }

    set({ streamStatus: 'connecting' });

    const url = `${getApiBaseUrl()}/chats/stream?accessToken=${encodeURIComponent(accessToken)}`;
    stream = new EventSource(url);

    stream.addEventListener('ready', () => {
      set({ streamStatus: 'connected' });
    });

    stream.addEventListener('chat.message.created', (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as ChatMessageCreatedEvent;
      const message = normalizeMessage(payload.message, payload.chatId);
      if (!message) {
        return;
      }

      set((state) => {
        const currentUserId = useUserStore.getState().currentUser?.id;
        const nextChats = applyMessageToChat(
          state.chats,
          payload.chatId,
          message,
          currentUserId,
          state.activeChatId,
        );
        const nextDetails = state.detailsById[payload.chatId]
          ? {
              ...state.detailsById,
              [payload.chatId]: {
                ...state.detailsById[payload.chatId],
                lastMessage: message,
                lastMessageAt: message.createdAt,
                unreadCount:
                  state.activeChatId === payload.chatId || message.senderId === currentUserId
                    ? 0
                    : (state.detailsById[payload.chatId].unreadCount || 0) + 1,
              },
            }
          : state.detailsById;

        return {
          messagesByChatId: {
            ...state.messagesByChatId,
            [payload.chatId]: upsertMessage(state.messagesByChatId[payload.chatId] || [], message),
          },
          chats: nextChats,
          detailsById: nextDetails,
        };
      });

      if (get().activeChatId === payload.chatId && message.senderId !== useUserStore.getState().currentUser?.id) {
        void get().markRead(payload.chatId).catch(() => undefined);
      }
    });

    stream.addEventListener('chat.read.updated', (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as ChatReadEvent;
      const currentUser = useUserStore.getState().currentUser;
      const isCandidate = currentUser?.id === payload.userId
        ? currentUser.role === 'candidate'
        : get().detailsById[payload.chatId]?.candidateId === payload.userId;

      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === payload.chatId
            ? {
                ...chat,
                unreadCount: currentUser?.id === payload.userId ? 0 : chat.unreadCount,
                candidateLastReadAt: isCandidate ? payload.readAt : chat.candidateLastReadAt,
                hrLastReadAt: isCandidate ? chat.hrLastReadAt : payload.readAt,
              }
            : chat,
        ),
        detailsById: state.detailsById[payload.chatId]
          ? {
              ...state.detailsById,
              [payload.chatId]: {
                ...state.detailsById[payload.chatId],
                unreadCount:
                  currentUser?.id === payload.userId
                    ? 0
                    : state.detailsById[payload.chatId].unreadCount,
                candidateLastReadAt: isCandidate
                  ? payload.readAt
                  : state.detailsById[payload.chatId].candidateLastReadAt,
                hrLastReadAt: isCandidate
                  ? state.detailsById[payload.chatId].hrLastReadAt
                  : payload.readAt,
              },
            }
          : state.detailsById,
      }));
    });

    stream.onerror = () => {
      set({ streamStatus: 'error' });
    };
  },

  disconnectStream: () => {
    if (stream) {
      stream.close();
      stream = null;
    }

    set({ streamStatus: 'idle' });
  },

  getOtherParticipant: (chat) => {
    const currentUserId = useUserStore.getState().currentUser?.id;
    if (!chat || !currentUserId) {
      return null;
    }

    return chat.candidateId === currentUserId ? chat.hrUser || null : chat.candidate || null;
  },
}));
