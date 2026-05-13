import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';
import { Button, Input } from '@shared/ui';
import { useMessageStore, type ChatDetails, type ChatMessage } from '@entities/message';
import { useUserStore } from '@entities/user';

interface ChatWindowProps {
  chat: ChatDetails;
  onClose?: () => void;
  embedded?: boolean;
}

const formatTime = (timestamp?: string): string => {
  if (!timestamp) {
    return '—';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatMessageDate = (timestamp?: string): string => {
  if (!timestamp) {
    return 'Unknown time';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return date.toLocaleString();
};

const getSenderName = (message: ChatMessage): string => {
  const firstName = message.sender?.firstName || '';
  const lastName = message.sender?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || message.sender?.email || 'System';
};

export const ChatWindow = ({ chat, onClose, embedded = false }: ChatWindowProps) => {
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { currentUser } = useUserStore();
  const {
    messagesByChatId,
    isLoadingMessages,
    isSending,
    setActiveChat,
    loadMessages,
    sendMessage,
    markRead,
    getOtherParticipant,
  } = useMessageStore();

  const messages = messagesByChatId[chat.id] || [];
  const canSend = Boolean(message.trim()) && !isSending;
  const otherParticipant = useMemo(() => getOtherParticipant(chat), [chat, getOtherParticipant]);
  const participantName = useMemo(() => {
    const firstName = otherParticipant?.firstName || '';
    const lastName = otherParticipant?.lastName || '';
    return `${firstName} ${lastName}`.trim() || otherParticipant?.email || 'Chat participant';
  }, [otherParticipant]);

  useEffect(() => {
    setActiveChat(chat.id);

    void Promise.allSettled([loadMessages(chat.id), markRead(chat.id)]);

    return () => {
      setActiveChat(null);
    };
  }, [chat.id, loadMessages, markRead, setActiveChat]);

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) {
      return;
    }

    setSubmitError(null);

    try {
      await sendMessage(chat.id, message.trim());
      setMessage('');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  const containerStyle = embedded
    ? { backgroundColor: 'transparent' }
    : {
        position: 'fixed' as const,
        bottom: '1rem',
        right: '1rem',
        width: '24rem',
        height: '600px',
        backgroundColor: '#FCFFF5',
        borderRadius: '1rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        zIndex: 50,
      };

  return (
    <div
      className={`flex h-full w-full flex-col ${embedded ? '' : 'fixed bottom-4 right-4 z-50 h-[600px] w-96'}`}
      style={containerStyle}
    >
      <div className="flex items-center justify-between border-b border-[#2B3B23]/10 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#1F2B18]">{participantName}</p>
          <p className="truncate text-xs text-[#5F7354]">{chat.vacancy?.title || 'Application chat'}</p>
          <p className="mt-1 text-[11px] text-[#7A8D6E]">{messages.length} messages in this thread</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-[#607456] transition-colors hover:text-[#2B3B23]">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-[#F8FCEC] p-4">
        {isLoadingMessages ? (
          <p className="text-sm text-[#607456]">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[#607456]">
            No messages yet. The application event appears here after chat initialization.
          </p>
        ) : (
          messages.map((item) => {
            const isOwn = item.senderId === currentUser?.id;
            const isSystem = item.type === 'SYSTEM';
            const isApplication = item.type === 'APPLICATION';

            if (isSystem) {
              return (
                <div key={item.id} className="rounded-xl border border-[#2B3B23]/10 bg-[#EEF4DE] px-3 py-2 text-sm text-[#4D6042]">
                  <div className="font-semibold">System update</div>
                  <div className="mt-1">{item.text}</div>
                  <div className="mt-1 text-xs text-[#718567]">{formatMessageDate(item.createdAt)}</div>
                </div>
              );
            }

            return (
              <div key={item.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && <div className="mb-1 text-xs font-semibold text-[#5E7253]">{getSenderName(item)}</div>}

                  <div
                    className="rounded-2xl px-4 py-3"
                    style={
                      isOwn
                        ? { backgroundColor: '#1F2B18', color: 'white' }
                        : isApplication
                          ? { backgroundColor: '#DDECCD', color: '#1F2B18' }
                          : { backgroundColor: '#E8F0D8', color: '#1F2B18' }
                    }
                  >
                    {isApplication && (
                      <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#275E44]">
                        Application started
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm">{item.text}</p>
                    <p className="mt-2 text-xs" style={{ color: isOwn ? 'rgba(255,255,255,0.72)' : '#5D7151' }}>
                      {formatTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#2B3B23]/10 bg-white px-4 py-3">
        {submitError && <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div>}
        <p className="mb-2 text-[11px] text-[#738667]">Press Enter to send, Shift+Enter for a new line.</p>
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Write a message"
            className="h-11 flex-1 rounded-xl border-[#9FB08A]/35 bg-white"
          />
          <Button onClick={() => void handleSend()} variant="hero" size="icon" disabled={!canSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
