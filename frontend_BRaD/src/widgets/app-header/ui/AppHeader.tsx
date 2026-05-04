import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import { isAdminRole, isHrRole, useUserStore } from '@entities/user';
import { useNotificationsStore } from '@entities/notification';
import { useMessageStore } from '@entities/message';

const navLinkBase =
  'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200';

const navLinkState = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? `${navLinkBase} bg-primary text-white shadow-md`
    : `${navLinkBase} text-[#2B3B23] hover:bg-[#E7EED6]`;

export const AppHeader = () => {
  const { currentUser, currentProfile, isAuthenticated, logout } = useUserStore();
  const { meta, loadNotifications } = useNotificationsStore();
  const { chats, listChats, connectStream, disconnectStream } = useMessageStore();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHr = isHrRole(currentUser?.role);
  const isAdmin = isAdminRole(currentUser?.role);
  const unreadCount = meta.unread;
  const unreadChatCount = chats.reduce((total, chat) => total + chat.unreadCount, 0);

  const avatarSrc =
    (currentProfile &&
    typeof currentProfile === 'object' &&
    'avatarUrl' in currentProfile &&
    typeof currentProfile.avatarUrl === 'string'
      ? currentProfile.avatarUrl
      : '') || currentUser?.avatar || '';

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectStream();
      return;
    }

    void loadNotifications({ limit: 10, offset: 0 });
    void listChats({ limit: 50, offset: 0 });
    connectStream();

    return () => {
      disconnectStream();
    };
  }, [connectStream, disconnectStream, isAuthenticated, listChats, loadNotifications]);

  const handleLogout = async () => {
    await logout();
    navigate('/app');
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

              <Link
                to="/app/chat"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2B3B23]/15 bg-white/80 text-[#2B3B23] transition-colors hover:bg-[#ECF2DB]"
                title="Messages"
              >
                <MessageSquare className="h-4 w-4" />
                {unreadChatCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#1E6648] px-1 text-center text-[10px] font-bold text-white">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </Link>

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
    </header>
  );
};
