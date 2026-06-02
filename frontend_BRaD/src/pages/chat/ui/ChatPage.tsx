import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageSquare, RefreshCcw, Search, User, Wifi, X } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input } from '@shared/ui';
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
  const [search, setSearch] = useState('');
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

  const selectedChat = useMemo(() => {
    if (!selectedChatId) {
      return null;
    }

    return detailsById[selectedChatId] || chats.find((chat) => chat.id === selectedChatId) || null;
  }, [chats, detailsById, selectedChatId]);

  const visibleChats = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return chats;
    }

    return chats.filter((chat) => {
      const other = getOtherParticipant(chat);
      const fullName = `${other?.firstName || ''} ${other?.lastName || ''}`.trim().toLowerCase();
      const email = (other?.email || '').toLowerCase();
      const vacancy = (chat.vacancy?.title || '').toLowerCase();

      return fullName.includes(needle) || email.includes(needle) || vacancy.includes(needle);
    });
  }, [chats, getOtherParticipant, search]);

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

  const handleBackToList = () => {
    setSelectedChatId(null);
    setActiveChat(null);
    setSearchParams({});
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
        <section className="app-section-card app-page-hero p-6 sm:p-7">
          <div className="app-toolbar">
            <div className="app-section-heading">
              <p className="app-section-eyebrow">Inbox</p>
              <h1 className="app-title text-2xl sm:text-3xl">Messages</h1>
              <p className="app-text-muted text-sm sm:text-base">
                Keep active application conversations in one place. Search a chat on the left and continue the thread on the right.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="app-chip hidden sm:inline-flex">
                <Wifi className="h-3.5 w-3.5" />
                Stream: {streamStatus}
              </span>
              <span className="app-chip hidden sm:inline-flex">Chats: {meta.total}</span>
              <Button variant="outline" size="sm" onClick={() => void listChats({ limit: 50, offset: 0 })}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-5 app-stat-grid">
            <div className="app-kpi-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">Total chats</p>
              <p className="mt-2 text-2xl font-extrabold text-[var(--surface-text-primary)]">{meta.total}</p>
            </div>
            <div className="app-kpi-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">Visible now</p>
              <p className="mt-2 text-2xl font-extrabold text-[var(--surface-text-primary)]">{visibleChats.length}</p>
            </div>
            <div className="app-kpi-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">Status</p>
              <p className="mt-2 text-xl font-extrabold text-[var(--surface-text-primary)]">{streamStatus}</p>
            </div>
          </div>
        </section>

        {(pageError || error) && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError || error}
          </div>
        )}

        <section className="mt-6 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6">
          <div className={`${selectedChat ? 'hidden lg:block' : 'block'} app-section-card p-4 sm:p-5`}>
            <div className="app-toolbar mb-4">
              <div className="app-section-heading">
                <p className="app-section-eyebrow">Conversations</p>
                <h2 className="app-title text-lg">Choose a thread</h2>
              </div>
              <span className="rounded-full bg-[#EBF1DE] px-2.5 py-1 text-[11px] font-semibold text-[#2B3B23]">
                {visibleChats.length}/{chats.length}
              </span>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65785A]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email, vacancy"
                  className="h-11 rounded-2xl border-[#9FB08A]/35 bg-white dark:bg-[#111814] pl-10 pr-10"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#65785A] hover:bg-[#EEF4E0]"
                    aria-label="Clear chat search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {isLoadingList ? (
              <p className="app-text-muted text-sm">Loading conversations...</p>
            ) : chats.length === 0 ? (
              <div className="app-empty-state">
                <div className="app-empty-state-icon">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <p className="app-title text-lg">No chats yet</p>
                  <p className="app-text-muted mt-2 text-sm">Chats will appear here after applications and invite flows start.</p>
                </div>
              </div>
            ) : visibleChats.length === 0 ? (
              <div className="app-empty-state">
                <div className="app-empty-state-icon">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <p className="app-title text-lg">Nothing matched your search</p>
                  <p className="app-text-muted mt-2 text-sm">Try another name, vacancy title or email.</p>
                </div>
              </div>
            ) : (
              <div className="app-list-scroll space-y-2 lg:max-h-[620px] lg:overflow-y-auto lg:pr-1">
                {visibleChats.map((chat) => {
                  const other = getOtherParticipant(chat);
                  const fullName = `${other?.firstName || ''} ${other?.lastName || ''}`.trim();
                  const displayName = fullName || other?.email || 'Unknown user';
                  const selected = selectedChatId === chat.id;

                  return (
                    <button
                      key={chat.id}
                      onClick={() => void handleSelectChat(chat.id)}
                      className={`w-full rounded-2xl border p-3.5 text-left transition-colors ${
                        selected
                          ? 'border-[#2B6A4D] bg-[#ECF5DE]'
                          : 'border-[#2B3B23]/10 bg-white dark:bg-[#111814] hover:bg-[#F4F8EA]'
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

          <div className={`${selectedChat ? 'block' : 'hidden lg:block'}`}>
            {selectedChat ? (
              <div className="app-section-card h-[calc(100dvh-170px)] overflow-hidden lg:h-[620px]">
                <ChatWindow chat={selectedChat} embedded onClose={handleBackToList} />
              </div>
            ) : (
              <div className="app-section-card app-empty-state h-[620px] p-6">
                <div className="app-empty-state-icon">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="app-title text-xl">Open a conversation</h3>
                  <p className="app-text-muted mt-2 text-sm sm:text-base">
                    Pick a thread from the left to read messages, reply, and track application discussions in context.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
