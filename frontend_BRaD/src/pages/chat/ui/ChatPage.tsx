import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageSquare, RefreshCcw, User } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button } from '@shared/ui';
import { useMessageStore } from '@entities/message';
import { useUserStore } from '@entities/user';
import { ChatWindow } from '@features/chat';

const formatTime = (value?: string | null): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
};

export const ChatPage = () => {
  const { currentUser, isAuthenticated } = useUserStore();
  const {
    chats,
    detailsById,
    meta,
    isLoadingList,
    streamStatus,
    error,
    setActiveChat,
    listChats,
    loadChat,
    loadChatByApplication,
    getOtherParticipant,
  } = useMessageStore();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const bootstrap = async () => {
      setPageError(null);

      try {
        await listChats({ limit: 50, offset: 0 });

        const chatId = searchParams.get('chatId');
        const applicationId = searchParams.get('applicationId');

        if (applicationId) {
          const chat = await loadChatByApplication(applicationId);
          setSelectedChatId(chat.id);
          setActiveChat(chat.id);
          return;
        }

        if (chatId) {
          const chat = await loadChat(chatId);
          setSelectedChatId(chat.id);
          setActiveChat(chat.id);
          return;
        }

      } catch (loadError) {
        setPageError(loadError instanceof Error ? loadError.message : 'Failed to load chats');
      }
    };

    void bootstrap();
  }, [isAuthenticated, listChats, loadChat, loadChatByApplication, searchParams, setActiveChat]);

  useEffect(() => {
    if (!selectedChatId && chats[0]) {
      setSelectedChatId(chats[0].id);
      setActiveChat(chats[0].id);
    }
  }, [chats, selectedChatId, setActiveChat]);

  const selectedChat = useMemo(() => {
    if (!selectedChatId) {
      return null;
    }

    return detailsById[selectedChatId] || chats.find((chat) => chat.id === selectedChatId) || null;
  }, [chats, detailsById, selectedChatId]);

  const handleSelectChat = async (chatId: string) => {
    setSelectedChatId(chatId);
    setActiveChat(chatId);
    setSearchParams({ chatId });

    if (!detailsById[chatId]) {
      try {
        await loadChat(chatId);
      } catch (loadError) {
        setPageError(loadError instanceof Error ? loadError.message : 'Failed to open chat');
      }
    }
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#EBEDDF', paddingTop: '4rem' }}>
        <AppHeader />
        <main className="container mx-auto px-4 sm:px-6 py-10" style={{ maxWidth: '1280px' }}>
          <div className="mx-auto max-w-2xl rounded-[28px] border border-black/5 p-8 text-center" style={{ backgroundColor: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            <h1 className="font-heading text-3xl font-bold mb-3" style={{ color: '#333A2F' }}>
              Sign in to open chats
            </h1>
            <p className="mb-6 text-sm sm:text-base" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
              Chats appear after a candidate applies to a vacancy.
            </p>
            <Link to="/app/login">
              <Button variant="hero">Sign In</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EBEDDF', paddingTop: '4rem' }}>
      <AppHeader />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8" style={{ maxWidth: '1280px' }}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold" style={{ color: '#333A2F' }}>
              Messages
            </h1>
            <p className="mt-2 text-sm sm:text-base" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
              Realtime application chats between candidate and HR.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#FFFFFF', color: '#333A2F' }}>
              Stream: {streamStatus}
            </div>
            <div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#FFFFFF', color: '#333A2F' }}>
              {meta.total} chat(s)
            </div>
            <Button variant="outline" size="sm" onClick={() => void listChats({ limit: 50, offset: 0 })}>
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {(pageError || error) && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError || error}
          </div>
        )}

        <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-4 sm:gap-6">
          <div>
            <div className="bg-white rounded-2xl shadow-lg p-4" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
              <h2 className="font-heading text-xl font-bold mb-4" style={{ color: '#333A2F' }}>
                Conversations
              </h2>

              {isLoadingList ? (
                <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                  Loading conversations...
                </p>
              ) : chats.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No chats yet</p>
                  <p className="mt-2 text-xs">
                    A chat is created automatically after an application is submitted.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chats.map((chat) => {
                    const other = getOtherParticipant(chat);
                    const fullName = `${other?.firstName || ''} ${other?.lastName || ''}`.trim();
                    const displayName = fullName || other?.email || 'Unknown user';

                    return (
                      <button
                        key={chat.id}
                        onClick={() => void handleSelectChat(chat.id)}
                        className="w-full text-left p-4 rounded-xl transition-colors border"
                        style={
                          selectedChatId === chat.id
                            ? { backgroundColor: '#F7F8EF', borderColor: '#333A2F' }
                            : { backgroundColor: '#FFFFFF', borderColor: 'rgba(51, 58, 47, 0.08)' }
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EBEDDF' }}>
                            <User className="w-5 h-5" style={{ color: '#333A2F' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold truncate" style={{ color: '#333A2F' }}>
                                {displayName}
                              </p>
                              {chat.unreadCount > 0 && (
                                <span className="text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center" style={{ backgroundColor: '#333A2F', color: 'white' }}>
                                  {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm truncate" style={{ color: 'rgba(51, 58, 47, 0.68)' }}>
                              {chat.vacancy?.title || 'Application chat'}
                            </p>
                            {chat.lastMessage && (
                              <p className="mt-1 text-xs truncate" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                                {chat.lastMessage.text}
                              </p>
                            )}
                            <p className="mt-2 text-[11px]" style={{ color: 'rgba(51, 58, 47, 0.48)' }}>
                              {formatTime(chat.lastMessageAt || chat.application?.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            {selectedChat ? (
              <div className="bg-white rounded-2xl shadow-lg h-[620px] overflow-hidden" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                <ChatWindow chat={selectedChat} embedded />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg h-[620px] flex items-center justify-center" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                <div className="text-center" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to open the chat</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
