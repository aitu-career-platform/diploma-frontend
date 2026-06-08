import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  CheckCheck,
  ClipboardList,
  BarChart3,
  GripHorizontal,
  GraduationCap,
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
import { isAdminRole, isCandidateRole, isHrRole, isUniversityRole, useUserStore } from '@entities/user';
import { useNotificationsStore } from '@entities/notification';
import { useMessageStore } from '@entities/message';
import { useMediaStore } from '@entities/media';
import { ChatWindow } from '@features/chat';
import { BrandLogo, PreferencesControls } from '@shared/ui';
import { useUISettings } from '@shared/lib/ui-settings';

const navLinkBase =
  'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all duration-200';

const navLinkState = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? `${navLinkBase} border-[#BFD2C2] bg-[#F3F7F4] text-[#183223] dark:border-[#395544] dark:bg-[#1D2A22] dark:text-[#EAF2EC]`
    : `${navLinkBase} border-transparent text-[#324338] dark:text-[#C1D0C6] hover:border-[#E2E9E3] hover:bg-[#F8FAF8] dark:hover:bg-[#1B241E]`;

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
const NOTIFICATIONS_MODAL_WIDTH = 380;
const NOTIFICATIONS_MODAL_HEIGHT = 560;

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

const formatNotificationTime = (value?: string | null): string => {
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
  const { t } = useUISettings();
  const {
    items: notifications,
    meta,
    isLoading: isLoadingNotifications,
    isMutating: isMutatingNotifications,
    error: notificationsError,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationsStore();
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
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [notificationsModalError, setNotificationsModalError] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  const isHr = isHrRole(currentUser?.role);
  const isAdmin = isAdminRole(currentUser?.role);
  const isUniversity = isUniversityRole(currentUser?.role);
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
      setIsNotificationsModalOpen(false);
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
    if (!isChatModalOpen && !isNotificationsModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsChatModalOpen(false);
        setIsNotificationsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isChatModalOpen, isNotificationsModalOpen]);

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
    setIsNotificationsModalOpen(false);
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

  const getNotificationHref = (notification: { type?: string; payload?: Record<string, unknown> }) => {
    const payload = notification.payload || {};
    const vacancyId = typeof payload.vacancyId === 'string' ? payload.vacancyId : '';

    if (notification.type === 'VACANCY_INVITE') {
      return vacancyId ? `/app/jobs/${vacancyId}` : '/app/profile#notifications';
    }

    if (notification.type === 'NEW_APPLICATION') {
      return '/app/applications';
    }

    return '/app/profile#notifications';
  };

  const handleToggleNotificationsModal = async () => {
    if (!isAuthenticated) {
      navigate('/app/login');
      return;
    }

    if (window.innerWidth < 1024) {
      navigate('/app/profile#notifications');
      setMobileMenuOpen(false);
      return;
    }

    const nextOpen = !isNotificationsModalOpen;
    setIsNotificationsModalOpen(nextOpen);
    setIsChatModalOpen(false);
    setNotificationsModalError(null);
    setMobileMenuOpen(false);

    if (!nextOpen) {
      return;
    }

    try {
      await loadNotifications({ limit: 20, offset: 0 });
    } catch (error) {
      setNotificationsModalError(
        error instanceof Error ? error.message : 'Failed to load notifications',
      );
    }
  };

  const handleOpenNotification = async (notificationId: string, href: string) => {
    try {
      await markAsRead(notificationId);
    } catch {
      // no-op: allow navigation even if mark-read fails
    }

    setIsNotificationsModalOpen(false);
    navigate(href);
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotificationsModalError(null);
    try {
      await markAllAsRead();
      await loadNotifications({ limit: 20, offset: 0 });
    } catch (error) {
      setNotificationsModalError(
        error instanceof Error ? error.message : 'Failed to mark notifications',
      );
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
      { to: '/app', label: t('nav.dashboard'), icon: LayoutDashboard },
      { to: '/app/jobs', label: t('nav.jobs'), icon: Briefcase },
    ];

    if (isAuthenticated) {
      if (!isUniversity) {
        items.push({ to: '/app/applications', label: t('nav.applications'), icon: ClipboardList });
      }
      if (isCandidateRole(currentUser?.role)) {
        items.push({ to: '/app/mini-internships', label: t('nav.miniInternships'), icon: CheckCheck });
        items.push({ to: '/app/my-submissions', label: t('nav.mySubmissions'), icon: ClipboardList });
      }
      items.push({ to: '/app/profile', label: t('nav.profile'), icon: Users });
    }

    if (isHr) {
      items.push({ to: '/app/employer', label: t('nav.employer'), icon: Briefcase });
      items.push({
        to: '/app/employer/mini-internships',
        label: t('nav.employerMiniInternships'),
        icon: CheckCheck,
      });
    }

    if (isAdmin) {
      items.push({ to: '/app/admin', label: t('nav.operations'), icon: Shield });
      items.push({ to: '/statistics', label: t('nav.statistics'), icon: BarChart3 });
    }

    if (isUniversity) {
      items.push({ to: '/app/university', label: 'University', icon: GraduationCap });
    }

    return items;
  }, [isAdmin, isAuthenticated, isHr, isUniversity, t]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-2 rounded-[20px] border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] px-3 py-2.5 shadow-[0_12px_30px_rgba(16,24,18,0.06)] sm:gap-3 sm:px-4">
        <Link to="/app" className="shrink-0">
          <BrandLogo className="h-12 sm:h-14" />
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
          <PreferencesControls compact className="hidden xl:flex" />
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => void handleToggleNotificationsModal()}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] text-[#26362B] dark:text-[#E7EFE8] transition-colors hover:bg-[#F5F8F5] dark:hover:bg-[#1D2821]"
                title={t('header.notifications')}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#D6462E] px-1 text-center text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => void handleToggleChatModal()}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] text-[#26362B] dark:text-[#E7EFE8] transition-colors hover:bg-[#F5F8F5] dark:hover:bg-[#1D2821]"
                title={t('header.messages')}
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
                className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] sm:block"
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt={currentUser?.name || 'User'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#2B3B23] dark:text-[#E7EFE8]">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </Link>

              <button
                onClick={() => void handleLogout()}
                className="hidden items-center gap-2 rounded-xl border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] px-3 py-2 text-sm font-semibold text-[#26362B] dark:text-[#E7EFE8] transition-colors hover:bg-[#F5F8F5] dark:hover:bg-[#1D2821] md:inline-flex"
              >
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/app/login"
                className="hidden rounded-xl border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] px-3 py-2 text-sm font-semibold text-[#26362B] dark:text-[#E7EFE8] transition-colors hover:bg-[#F5F8F5] dark:hover:bg-[#1D2821] sm:inline-flex"
              >
                {t('nav.signIn')}
              </Link>
              <Link
                to="/app/register"
                className="hidden rounded-xl bg-[#2B6A4D] px-3 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(43,106,77,0.18)] transition-colors hover:bg-[#24583F] sm:inline-flex"
              >
                {t('nav.createAccount')}
              </Link>
            </>
          )}

          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] text-[#26362B] dark:text-[#E7EFE8] lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="mx-auto mt-2 w-full max-w-[1280px] lg:hidden">
        <PreferencesControls compact className="w-full justify-between" />
      </div>

      {mobileMenuOpen && (
        <div className="mx-auto mt-3 w-full max-w-[1280px] rounded-[20px] border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] p-4 shadow-[0_18px_34px_rgba(16,24,18,0.06)] lg:hidden">
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
                  {t('nav.notifications')} {unreadCount > 0 ? `(${unreadCount})` : ''}
                </NavLink>

                <NavLink
                  to="/app/chat"
                  className={navLinkState}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MessageSquare className="h-4 w-4" />
                  {t('nav.messages')} {unreadChatCount > 0 ? `(${unreadChatCount})` : ''}
                </NavLink>

                <button
                  onClick={() => {
                    void handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-[#324338] dark:text-[#C1D0C6] hover:border-[#E2E9E3] hover:bg-[#F8FAF8] dark:hover:bg-[#1B241E]"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/app/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] px-3 py-2 text-sm font-semibold text-[#26362B] dark:text-[#E7EFE8]"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/app/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#2B6A4D] px-3 py-2 text-sm font-semibold text-white"
                >
                  {t('nav.createAccount')}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

      {isAuthenticated && isNotificationsModalOpen && (
        <div className="pointer-events-none fixed inset-0 z-[72] hidden lg:block">
          <div className="pointer-events-auto fixed inset-0 bg-[rgba(16,24,18,0.08)]" onClick={() => setIsNotificationsModalOpen(false)} />
          <div
            className="pointer-events-auto fixed"
            style={{
              width: `${NOTIFICATIONS_MODAL_WIDTH}px`,
              height: `${NOTIFICATIONS_MODAL_HEIGHT}px`,
              right: '18px',
              top: '92px',
            }}
          >
            <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] shadow-[0_24px_60px_rgba(16,24,18,0.12)]">
              <div className="flex items-center justify-between gap-2 border-b border-[#EEF2EE] dark:border-[#28352C] bg-white dark:bg-[#161D18] px-4 py-3 text-[#18231C] dark:text-[#EAF2EC]">
                <div>
                  <p className="text-sm font-semibold">{t('header.notifications')}</p>
                  <p className="text-[11px] text-[#6B776E] dark:text-[#9AA89F]">{t('header.unread')}: {meta.unread}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void loadNotifications({ limit: 20, offset: 0 })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] text-[#26362B] dark:text-[#E7EFE8] transition-colors hover:bg-[#F5F8F5] dark:hover:bg-[#1D2821]"
                    title={t('header.refreshNotifications')}
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNotificationsModalOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] text-[#26362B] dark:text-[#E7EFE8] transition-colors hover:bg-[#F5F8F5] dark:hover:bg-[#1D2821]"
                    title={t('common.close')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="border-b border-[#EEF2EE] dark:border-[#28352C] bg-[#FAFCFA] dark:bg-[#18211B] px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => void handleMarkAllNotificationsRead()}
                  disabled={isMutatingNotifications || meta.unread === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6DED7] bg-white px-3 py-1.5 text-xs font-semibold text-[#23402D] transition-colors hover:bg-[#F5F8F5] dark:hover:bg-[#1D2821] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {t('header.markAllRead')}
                </button>
              </div>

              {(notificationsModalError || notificationsError) && (
                <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                  {notificationsModalError || notificationsError}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto bg-white dark:bg-[#161D18] p-3">
                {isLoadingNotifications ? (
                  <p className="rounded-lg bg-[#F7F9F7] dark:bg-[#1A241D] px-3 py-2 text-xs text-[#5E7253] dark:text-[#9FB0A4]">{t('header.loadingNotifications')}</p>
                ) : notifications.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-5 text-center">
                    <div>
                      <Bell className="mx-auto h-8 w-8 text-[#5E7253] dark:text-[#9FB0A4]" />
                      <p className="mt-2 text-sm font-medium text-[#2B3B23] dark:text-[#E7EFE8]">{t('header.noNotifications')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => {
                      const href = getNotificationHref(notification);
                      const isUnread = !notification.readAt;

                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => void handleOpenNotification(notification.id, href)}
                          className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                            isUnread
                              ? 'border-[#C9D9CC] dark:border-[#395544] bg-[#F4F8F5] dark:bg-[#1D2A22] hover:bg-[#EDF4EF] dark:hover:bg-[#223126]'
                              : 'border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] hover:bg-[#F8FAF8] dark:hover:bg-[#1B241E]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-xs font-semibold text-[#23301D] dark:text-[#EAF2EC]">
                              {notification.title || t('header.notification')}
                            </p>
                            {isUnread && <span className="mt-1 h-2 w-2 rounded-full bg-[#1E6648]" />}
                          </div>
                          <p className="mt-1 text-[10px] text-[#798C6D] dark:text-[#8FA398]">
                            {formatNotificationTime(notification.createdAt)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
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
            <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] shadow-[0_24px_60px_rgba(16,24,18,0.12)]">
              <div
                onMouseDown={handleChatModalDragStart}
                className={`flex items-center justify-between gap-2 border-b border-[#EEF2EE] dark:border-[#28352C] bg-white dark:bg-[#161D18] px-3 py-2 text-[#18231C] dark:text-[#EAF2EC] ${isDraggingChatModal ? 'cursor-grabbing' : 'cursor-grab'}`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <GripHorizontal className="h-4 w-4 text-[#7A867D]" />
                    {t('header.messages')}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6B776E] dark:text-[#9AA89F]">{t('header.dragHint')}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void listChats({ limit: 50, offset: 0 })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] text-[#26362B] dark:text-[#E7EFE8] transition-colors hover:bg-[#F5F8F5] dark:hover:bg-[#1D2821]"
                    title={t('header.refreshChats')}
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChatModalOpen(false);
                      navigate('/app/chat');
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] text-[#26362B] dark:text-[#E7EFE8] transition-colors hover:bg-[#F5F8F5] dark:hover:bg-[#1D2821]"
                    title={t('header.openFullPage')}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChatModalOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E3E9E4] bg-white dark:border-[#314036] dark:bg-[#161D18] text-[#26362B] dark:text-[#E7EFE8] transition-colors hover:bg-[#F5F8F5] dark:hover:bg-[#1D2821]"
                    title={t('common.close')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="border-b border-[#EEF2EE] dark:border-[#28352C] bg-[#FAFCFA] dark:bg-[#18211B] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#506544] dark:text-[#9FB0A4]">{t('header.conversations')}</p>
                  <span className="rounded-full bg-[#DFE9D0] dark:bg-[#2A3A2E] px-2 py-0.5 text-[11px] font-semibold text-[#294327] dark:text-[#CDE1D2]">
                    {visibleChats.length}/{chats.length}
                  </span>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5E7253] dark:text-[#9FB0A4]" />
                  <input
                    value={chatSearch}
                    onChange={(event) => setChatSearch(event.target.value)}
                    placeholder={t('header.searchChats')}
                    className="h-9 w-full rounded-xl border border-[#9FB08A]/35 bg-white dark:bg-[#111814] dark:border-[#314036] pl-9 pr-3 text-sm text-[#20301B] dark:text-[#E7EFE8] outline-none transition-colors placeholder:text-[#7A8D6E] dark:placeholder:text-[#93A097] focus:border-[#2B6A4D]/45 dark:focus:border-[#4A966E]/45"
                  />
                </div>

                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                  {isLoadingChatList ? (
                    <p className="rounded-lg bg-white/80 px-3 py-2 text-xs text-[#5E7253] dark:text-[#9FB0A4]">{t('header.loadingChats')}</p>
                  ) : visibleChats.length === 0 ? (
                    <p className="rounded-lg bg-white/80 px-3 py-2 text-xs text-[#5E7253] dark:text-[#9FB0A4]">{t('header.noDialogs')}</p>
                  ) : (
                    visibleChats.map((chat) => {
                      const other = getOtherParticipant(chat);
                      const fullName = `${other?.firstName || ''} ${other?.lastName || ''}`.trim();
                      const displayName = fullName || other?.email || t('header.unknownUser');
                      const selected = chat.id === selectedChatId;

                      return (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => void handleSelectChat(chat.id)}
                          className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                            selected
                              ? 'border-[#2B6A4D]/35 bg-[#E8F3DE] dark:bg-[#223427]'
                              : 'border-[#9FB08A]/25 bg-white hover:bg-[#F6FAED] dark:bg-[#1C2A20]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-[#23301D] dark:text-[#EAF2EC]">{displayName}</p>
                            {chat.unreadCount > 0 && (
                              <span className="rounded-full bg-[#D63D32] px-1.5 text-[10px] font-bold text-white">
                                {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-[#5E7352] dark:text-[#9FB0A4]">{chat.vacancy?.title || t('header.applicationChat')}</p>
                          <p className="mt-0.5 text-[10px] text-[#798C6D] dark:text-[#8FA398]">
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

              <div className="min-h-0 flex-1 bg-white dark:bg-[#161D18]">
                {selectedChat ? (
                  <ChatWindow chat={selectedChat} embedded />
                ) : (
                  <div className="flex h-full items-center justify-center px-5 text-center">
                    <div>
                      <MessageSquare className="mx-auto h-8 w-8 text-[#5E7253] dark:text-[#9FB0A4]" />
                      <p className="mt-2 text-sm font-medium text-[#2B3B23] dark:text-[#E7EFE8]">{t('header.selectConversation')}</p>
                      <p className="mt-1 text-xs text-[#6B7E60] dark:text-[#97AA9E]">
                        {t('header.dialogsAppearHint')}
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
