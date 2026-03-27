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
    ? { backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }
    : {
        position: 'fixed' as const,
        bottom: '1rem',
        right: '1rem',
        width: '24rem',
        height: '600px',
        backgroundColor: 'white',
        borderRadius: '1rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        zIndex: 50,
      };

  return (
    <div
      className={`w-full h-full flex flex-col ${embedded ? '' : 'fixed bottom-4 right-4 w-96 h-[600px] z-50'}`}
      style={containerStyle}
    >
      <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(51, 58, 47, 0.1)' }}>
        <div className="min-w-0">
          <p className="font-semibold truncate" style={{ color: '#333A2F' }}>
            {participantName}
          </p>
          <p className="text-xs truncate" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
            {chat.vacancy?.title || 'Application chat'}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="transition-colors" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
            No messages yet. The application event will appear here after the chat is initialized.
          </p>
        ) : (
          messages.map((item) => {
            const isOwn = item.senderId === currentUser?.id;
            const isSystem = item.type === 'SYSTEM';
            const isApplication = item.type === 'APPLICATION';

            if (isSystem) {
              return (
                <div key={item.id} className="rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: '#F7F8F1', color: 'rgba(51, 58, 47, 0.75)' }}>
                  <div className="font-medium">System update</div>
                  <div className="mt-1">{item.text}</div>
                  <div className="mt-1 text-xs">{formatMessageDate(item.createdAt)}</div>
                </div>
              );
            }

            return (
              <div key={item.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isOwn && (
                    <div className="mb-1 text-xs font-medium" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                      {getSenderName(item)}
                    </div>
                  )}
                  <div
                    className="rounded-2xl px-4 py-3"
                    style={
                      isOwn
                        ? { backgroundColor: '#333A2F', color: 'white' }
                        : isApplication
                          ? { backgroundColor: '#E4E9D3', color: '#333A2F' }
                          : { backgroundColor: '#EBEDDF', color: '#333A2F' }
                    }
                  >
                    {isApplication && (
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em]">
                        Application started
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{item.text}</p>
                    <p
                      className="text-xs mt-2"
                      style={{ color: isOwn ? 'rgba(255, 255, 255, 0.72)' : 'rgba(51, 58, 47, 0.6)' }}
                    >
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

      <div className="p-4" style={{ borderTop: '1px solid rgba(51, 58, 47, 0.1)' }}>
        {submitError && (
          <div className="mb-3 rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#b91c1c' }}>
            {submitError}
          </div>
        )}
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
            placeholder="Type a message..."
            className="flex-1"
            style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
          />
          <Button
            onClick={() => void handleSend()}
            variant="hero"
            size="icon"
            disabled={isSending}
            style={{ backgroundColor: '#333A2F', color: 'white' }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
