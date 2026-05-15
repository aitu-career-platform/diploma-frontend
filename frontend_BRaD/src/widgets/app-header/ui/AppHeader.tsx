import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  ClipboardList,
  GripHorizontal,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  RefreshCcw,
  Search,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import { isAdminRole, isHrRole, useUserStore } from '@entities/user';
import { useNotificationsStore } from '@entities/notification';
import { useMessageStore } from '@entities/message';
import { useMediaStore } from '@entities/media';
import { ChatWindow } from '@features/chat';

const navLinkBase =
  'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200';

const navLinkState = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? `${navLinkBase} bg-primary text-white shadow-md`
    : `${navLinkBase} text-[#2B3B23] hover:bg-[#E7EED6]`;

const getRecord = (value: unknown): Record<string, unknown> | null => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const getString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const CHAT_MODAL_WIDTH = 420;
const CHAT_MODAL_HEIGHT = 620;

const formatChatTime = (value?: string | null): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const AppHeader = () => {
  const { currentUser, currentProfile, isAuthenticated, logout } = useUserStore();
  const { meta, loadNotifications } = useNotificationsStore();
  const {
    chats,
    detailsById,
    isLoadingList: isLoadingChatList,
    error: chatError,
    listChats,
    loadChat,
    connectStream,
    disconnectStream,
    getOtherParticipant,
    setActiveChat,
  } = useMessageStore();
  const { getDownloadUrl } = useMediaStore();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState('');
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatModalError, setChatModalError] = useState<string | null>(null);
  const [chatModalPosition, setChatModalPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 108,
  });
  const [isDraggingChatModal, setIsDraggingChatModal] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  const isHr = isHrRole(currentUser?.role);
  const isAdmin = isAdminRole(currentUser?.role);
  const unreadCount = meta.unread;
  const unreadChatCount = chats.reduce((total, chat) => total + chat.unreadCount, 0);
  const profileRecord = getRecord(currentProfile);
  const avatarFile = getRecord(profileRecord?.avatarFile);
  const nestedAvatarFile = getRecord(avatarFile?.file);
  const avatarFileId =
    getString(avatarFile?.fileId) ||
    getString(avatarFile?.id) ||
    getString(nestedAvatarFile?.id);

  const avatarSrc =
    resolvedAvatarUrl ||
    (currentProfile &&
    typeof currentProfile === 'object' &&
    'avatarUrl' in currentProfile &&
    typeof currentProfile.avatarUrl === 'string'
      ? currentProfile.avatarUrl
      : '') || currentUser?.avatar || '';

  useEffect(() => {
    if (!avatarFileId) {
      setResolvedAvatarUrl('');
      return;
    }

    let cancelled = false;

    void getDownloadUrl(avatarFileId)
      .then((downloadUrl) => {
        if (!cancelled) {
          setResolvedAvatarUrl(downloadUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedAvatarUrl('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [avatarFileId, getDownloadUrl]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectStream();
      setIsChatModalOpen(false);
      return;
    }

    void loadNotifications({ limit: 10, offset: 0 });
    void listChats({ limit: 50, offset: 0 });
    connectStream();

    return () => {
      disconnectStream();
    };
  }, [connectStream, disconnectStream, isAuthenticated, listChats, loadNotifications]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedChatId(null);
      setChatSearch('');
      setChatModalError(null);
      return;
    }

    if (selectedChatId && chats.some((chat) => chat.id === selectedChatId)) {
      return;
    }

    const firstChatId = chats[0]?.id || null;
    setSelectedChatId(firstChatId);
    setActiveChat(firstChatId);
  }, [chats, isAuthenticated, selectedChatId, setActiveChat]);

  useEffect(() => {
    if (!isAuthenticated || !isChatModalOpen) {
      return;
    }

    const defaultX = Math.max(14, window.innerWidth - CHAT_MODAL_WIDTH - 20);
    const defaultY = Math.max(92, Math.min(126, window.innerHeight - CHAT_MODAL_HEIGHT - 14));
    setChatModalPosition({ x: defaultX, y: defaultY });
  }, [isAuthenticated, isChatModalOpen]);

  useEffect(() => {
    if (!isChatModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsChatModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isChatModalOpen]);

  useEffect(() => {
    if (!isDraggingChatModal) {
      return;
    }

    const clampPosition = (x: number, y: number) => {
      const padding = 12;
      const maxX = Math.max(padding, window.innerWidth - CHAT_MODAL_WIDTH - padding);
      const maxY = Math.max(86, window.innerHeight - CHAT_MODAL_HEIGHT - padding);

      return {
        x: Math.min(Math.max(padding, x), maxX),
        y: Math.min(Math.max(86, y), maxY),
      };
    };

    const handleMouseMove = (event: MouseEvent) => {
      const offset = dragOffsetRef.current;
      if (!offset) {
        return;
      }

      const next = clampPosition(event.clientX - offset.x, event.clientY - offset.y);
      setChatModalPosition(next);
    };

    const stopDragging = () => {
      dragOffsetRef.current = null;
      setIsDraggingChatModal(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopDragging);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDraggingChatModal]);

  const selectedChat = useMemo(() => {
    if (!selectedChatId) {
      return null;
    }

    return detailsById[selectedChatId] || chats.find((chat) => chat.id === selectedChatId) || null;
  }, [chats, detailsById, selectedChatId]);

  const visibleChats = useMemo(() => {
    const needle = chatSearch.trim().toLowerCase();
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
  }, [chatSearch, chats, getOtherParticipant]);

  const handleLogout = async () => {
    await logout();
    navigate('/app');
  };

  const handleToggleChatModal = async () => {
    if (!isAuthenticated) {
      navigate('/app/login');
      return;
    }

    if (window.innerWidth < 1024) {
      navigate('/app/chat');
      setMobileMenuOpen(false);
      return;
    }

    const nextOpen = !isChatModalOpen;
    setIsChatModalOpen(nextOpen);
    setChatModalError(null);
    setMobileMenuOpen(false);

    if (!nextOpen) {
      return;
    }

    try {
      await listChats({ limit: 50, offset: 0 });
    } catch (error) {
      setChatModalError(error instanceof Error ? error.message : 'Failed to load chats');
    }
  };

  const handleSelectChat = async (chatId: string) => {
    setSelectedChatId(chatId);
    setActiveChat(chatId);
    setChatModalError(null);

    if (detailsById[chatId]) {
      return;
    }

    try {
      await loadChat(chatId);
    } catch (error) {
      setChatModalError(error instanceof Error ? error.message : 'Failed to open chat');
    }
  };

  const handleChatModalDragStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const parent = event.currentTarget.parentElement;
    if (!parent) {
      return;
    }

    const rect = parent.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    setIsDraggingChatModal(true);
  };

  const navItems = useMemo(() => {
    const items = [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/app/jobs', label: 'Jobs', icon: Briefcase },
    ];

    if (isAuthenticated) {
      items.push({ to: '/app/applications', label: 'Applications', icon: ClipboardList });
      items.push({ to: '/app/profile', label: 'Profile', icon: Users });
    }

    if (isHr) {
      items.push({ to: '/app/employer', label: 'Employer', icon: Briefcase });
    }

    if (isAdmin) {
      items.push({ to: '/app/admin', label: 'Operations', icon: Shield });
    }

    return items;
  }, [isAdmin, isAuthenticated, isHr]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex w-full max-w-[1320px] items-center gap-2 rounded-2xl border border-[#2B3B23]/15 bg-[#F9FCEE]/85 px-3 py-2 shadow-[0_14px_34px_rgba(26,39,18,0.14)] backdrop-blur-xl sm:gap-3 sm:px-4">
        <Link to="/app" className="shrink-0">
          <img src="/images/logo/logo.png" alt="BRaD Logo" className="h-12 w-auto sm:h-14" />
        </Link>

        <nav className="hidden flex-1 items-center gap-2 overflow-x-auto lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink key={item.to} to={item.to} className={navLinkState} end={item.to === '/app'}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                to="/app/profile#notifications"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2B3B23]/15 bg-white/80 text-[#2B3B23] transition-colors hover:bg-[#ECF2DB]"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#D6462E] px-1 text-center text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={() => void handleToggleChatModal()}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2B3B23]/15 bg-white/80 text-[#2B3B23] transition-colors hover:bg-[#ECF2DB]"
                title="Messages"
              >
                <MessageSquare className="h-4 w-4" />
                {unreadChatCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#1E6648] px-1 text-center text-[10px] font-bold text-white">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </button>

              <Link
                to="/app/profile"
                className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#2B3B23]/15 bg-white/80 sm:block"
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt={currentUser?.name || 'User'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#2B3B23]">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </Link>

              <button
                onClick={() => void handleLogout()}
                className="hidden items-center gap-2 rounded-xl border border-[#2B3B23]/15 bg-white/90 px-3 py-2 text-sm font-semibold text-[#2B3B23] transition-colors hover:bg-[#ECF2DB] md:inline-flex"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/app/login"
                className="hidden rounded-xl border border-[#2B3B23]/20 bg-white/90 px-3 py-2 text-sm font-semibold text-[#2B3B23] transition-colors hover:bg-[#ECF2DB] sm:inline-flex"
              >
                Sign In
              </Link>
              <Link
                to="/app/register"
                className="hidden rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 sm:inline-flex"
              >
                Create Account
              </Link>
            </>
          )}

          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2B3B23]/20 bg-white/80 text-[#2B3B23] lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mx-auto mt-3 w-full max-w-[1320px] rounded-2xl border border-[#2B3B23]/15 bg-[#FAFDEE] p-4 shadow-[0_18px_34px_rgba(26,39,18,0.14)] lg:hidden">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={navLinkState}
                  onClick={() => setMobileMenuOpen(false)}
                  end={item.to === '/app'}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            {isAuthenticated ? (
              <>
                <NavLink
                  to="/app/profile#notifications"
                  className={navLinkState}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Bell className="h-4 w-4" />
                  Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
                </NavLink>

                <NavLink
                  to="/app/chat"
                  className={navLinkState}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Messages {unreadChatCount > 0 ? `(${unreadChatCount})` : ''}
                </NavLink>

                <button
                  onClick={() => {
                    void handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#2B3B23] hover:bg-[#E7EED6]"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/app/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-[#2B3B23]/20 bg-white px-3 py-2 text-sm font-semibold text-[#2B3B23]"
                >
                  Sign In
                </Link>
                <Link
                  to="/app/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white"
                >
                  Create Account
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

      {isAuthenticated && isChatModalOpen && (
        <div className="pointer-events-none fixed inset-0 z-[70] hidden lg:block">
          <div
            className="pointer-events-auto fixed"
            style={{
              width: `${CHAT_MODAL_WIDTH}px`,
              height: `${CHAT_MODAL_HEIGHT}px`,
              left: `${chatModalPosition.x}px`,
              top: `${chatModalPosition.y}px`,
            }}
          >
            <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-[#2B3B23]/15 bg-[#F9FCF1] shadow-[0_30px_80px_rgba(24,35,19,0.28)]">
              <div
                onMouseDown={handleChatModalDragStart}
                className={`flex items-center justify-between gap-2 border-b border-[#2B3B23]/10 bg-[linear-gradient(135deg,#214B31_0%,#2E6A47_70%,#3B7D56_100%)] px-3 py-2 text-white ${isDraggingChatModal ? 'cursor-grabbing' : 'cursor-grab'}`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <GripHorizontal className="h-4 w-4 text-white/85" />
                    Messages
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/80">Drag this window. Esc closes it.</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void listChats({ limit: 50, offset: 0 })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
                    title="Refresh chats"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChatModalOpen(false);
                      navigate('/app/chat');
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
                    title="Open full page"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChatModalOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
                    title="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="border-b border-[#2B3B23]/10 bg-[#F1F6E7] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#506544]">Conversations</p>
                  <span className="rounded-full bg-[#DFE9D0] px-2 py-0.5 text-[11px] font-semibold text-[#294327]">
                    {visibleChats.length}/{chats.length}
                  </span>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5E7253]" />
                  <input
                    value={chatSearch}
                    onChange={(event) => setChatSearch(event.target.value)}
                    placeholder="Search by name, email, vacancy"
                    className="h-9 w-full rounded-xl border border-[#9FB08A]/35 bg-white pl-9 pr-3 text-sm text-[#20301B] outline-none transition-colors placeholder:text-[#7A8D6E] focus:border-[#2B6A4D]/45"
                  />
                </div>

                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                  {isLoadingChatList ? (
                    <p className="rounded-lg bg-white/80 px-3 py-2 text-xs text-[#5E7253]">Loading chats...</p>
                  ) : visibleChats.length === 0 ? (
                    <p className="rounded-lg bg-white/80 px-3 py-2 text-xs text-[#5E7253]">No dialogs found.</p>
                  ) : (
                    visibleChats.map((chat) => {
                      const other = getOtherParticipant(chat);
                      const fullName = `${other?.firstName || ''} ${other?.lastName || ''}`.trim();
                      const displayName = fullName || other?.email || 'Unknown user';
                      const selected = chat.id === selectedChatId;

                      return (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => void handleSelectChat(chat.id)}
                          className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                            selected
                              ? 'border-[#2B6A4D]/35 bg-[#E8F3DE]'
                              : 'border-[#9FB08A]/25 bg-white hover:bg-[#F6FAED]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-[#23301D]">{displayName}</p>
                            {chat.unreadCount > 0 && (
                              <span className="rounded-full bg-[#D63D32] px-1.5 text-[10px] font-bold text-white">
                                {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-[#5E7352]">{chat.vacancy?.title || 'Application chat'}</p>
                          <p className="mt-0.5 text-[10px] text-[#798C6D]">
                            {formatChatTime(chat.lastMessageAt || chat.application?.createdAt)}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {(chatModalError || chatError) && (
                <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {chatModalError || chatError}
                </div>
              )}

              <div className="min-h-0 flex-1 bg-white">
                {selectedChat ? (
                  <ChatWindow chat={selectedChat} embedded />
                ) : (
                  <div className="flex h-full items-center justify-center px-5 text-center">
                    <div>
                      <MessageSquare className="mx-auto h-8 w-8 text-[#5E7253]" />
                      <p className="mt-2 text-sm font-medium text-[#2B3B23]">Select a conversation</p>
                      <p className="mt-1 text-xs text-[#6B7E60]">
                        New dialogs appear automatically after applications and invites.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
