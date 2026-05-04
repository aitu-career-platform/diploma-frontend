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
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <div className="app-section-card mx-auto max-w-2xl p-8 text-center">
            <h1 className="app-title text-3xl">Sign in to open chats</h1>
            <p className="app-text-muted mt-3 text-sm sm:text-base">
              Chats appear automatically after a candidate submits an application.
            </p>
            <Link to="/app/login" className="mt-6 inline-flex">
              <Button variant="hero">Sign In</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />
      <main className="app-page-main">
        <section className="app-section-card app-grid-backdrop relative overflow-hidden p-6 sm:p-7">
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="app-title text-3xl sm:text-4xl">Messages</h1>
              <p className="app-text-muted mt-2 text-sm sm:text-base">
                Realtime candidate and HR conversations linked to applications.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="app-chip">Stream: {streamStatus}</span>
              <span className="app-chip">Chats: {meta.total}</span>
              <Button variant="outline" size="sm" onClick={() => void listChats({ limit: 50, offset: 0 })}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        {(pageError || error) && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError || error}
          </div>
        )}

        <section className="mt-5 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-6">
          <div className="app-section-card p-4">
            <h2 className="app-title mb-3 text-lg">Conversations</h2>

            {isLoadingList ? (
              <p className="app-text-muted text-sm">Loading conversations...</p>
            ) : chats.length === 0 ? (
              <div className="py-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-[#6D7E62]" />
                <p className="app-text-muted mt-2 text-sm">No chats yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chats.map((chat) => {
                  const other = getOtherParticipant(chat);
                  const fullName = `${other?.firstName || ''} ${other?.lastName || ''}`.trim();
                  const displayName = fullName || other?.email || 'Unknown user';
                  const selected = selectedChatId === chat.id;

                  return (
                    <button
                      key={chat.id}
                      onClick={() => void handleSelectChat(chat.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        selected
                          ? 'border-[#2B6A4D] bg-[#ECF5DE]'
                          : 'border-[#2B3B23]/10 bg-white hover:bg-[#F4F8EA]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F0D8] text-[#2B3B23]">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-bold text-[#22301B]">{displayName}</p>
                            {chat.unreadCount > 0 && (
                              <span className="min-w-[20px] rounded-full bg-[#1E6648] px-1 text-center text-[10px] font-bold text-white">
                                {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-[#607456]">{chat.vacancy?.title || 'Application chat'}</p>
                          {chat.lastMessage && (
                            <p className="mt-1 truncate text-xs text-[#778A6E]">{chat.lastMessage.text}</p>
                          )}
                          <p className="mt-1 text-[11px] text-[#8B9D81]">
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

          <div>
            {selectedChat ? (
              <div className="app-section-card h-[620px] overflow-hidden">
                <ChatWindow chat={selectedChat} embedded />
              </div>
            ) : (
              <div className="app-section-card flex h-[620px] items-center justify-center p-6 text-center">
                <div>
                  <MessageSquare className="mx-auto h-16 w-16 text-[#6D7E62]" />
                  <p className="app-text-muted mt-3">Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
