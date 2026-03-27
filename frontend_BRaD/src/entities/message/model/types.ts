export type ChatMessageType = 'APPLICATION' | 'TEXT' | 'SYSTEM';

export interface ChatUserPreview {
  id: string;
  role?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface ChatVacancyPreview {
  id: string;
  title: string;
  status?: string;
  company?: {
    id: string;
    name: string;
  } | null;
}

export interface ChatApplicationPreview {
  id: string;
  status?: string;
  coverLetter?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId?: string | null;
  type: ChatMessageType;
  text: string;
  createdAt: string;
  meta?: Record<string, unknown> | null;
  sender?: ChatUserPreview | null;
}

export interface ChatSummary {
  id: string;
  applicationId: string;
  vacancyId: string;
  candidateId: string;
  hrUserId: string;
  lastMessageAt?: string | null;
  candidateLastReadAt?: string | null;
  hrLastReadAt?: string | null;
  unreadCount: number;
  vacancy?: ChatVacancyPreview | null;
  application?: ChatApplicationPreview | null;
  candidate?: ChatUserPreview | null;
  hrUser?: ChatUserPreview | null;
  lastMessage?: ChatMessage | null;
}

export interface ChatDetails extends ChatSummary {
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatListMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface ChatFilters {
  vacancyId?: string;
  applicationId?: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface ChatReadEvent {
  chatId: string;
  userId: string;
  readAt: string;
}

export interface ChatMessageCreatedEvent {
  chatId: string;
  applicationId: string;
  vacancyId: string;
  message: ChatMessage;
}
