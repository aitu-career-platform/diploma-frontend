import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  ClipboardList,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button } from '@shared/ui';
import { isAdminRole, isHrRole, useUserStore } from '@entities/user';

export const AppPage = () => {
  const { isAuthenticated, currentUser } = useUserStore();
  const isHr = isHrRole(currentUser?.role);
  const isAdmin = isAdminRole(currentUser?.role);

  const quickActions = [
    {
      to: '/app/jobs',
      icon: Search,
      title: 'Explore jobs',
      description: 'Use filters, compare roles, open details and apply in one flow.',
    },
    {
      to: '/app/applications',
      icon: ClipboardList,
      title: 'Track applications',
      description: 'See status timeline, updates, and move faster through hiring stages.',
    },
    {
      to: '/app/profile',
      icon: Users,
      title: 'Update profile',
      description: 'Keep CV, links, and personal details ready before HR reaches out.',
    },
  ];

  if (isHr) {
    quickActions.push({
      to: '/app/employer',
      icon: Briefcase,
      title: 'Manage vacancies',
      description: 'Create vacancies step by step and invite candidates directly from shortlist.',
    });
  }

  if (isAdmin) {
    quickActions.push({
      to: '/app/admin',
      icon: Shield,
      title: 'Operations panel',
      description: 'Moderate users, control vacancy states, and keep platform healthy.',
    });
  }

  if (isAuthenticated) {
    quickActions.push({
      to: '/app/chat',
      icon: MessageSquare,
      title: 'Open messages',
      description: 'Continue candidate-HR conversations linked to active applications.',
    });
  }

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />

      <main className="app-page-main">
        <section className="app-section-card app-grid-backdrop relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="app-chip mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                Main Workspace
              </span>

              <h1 className="app-title text-3xl sm:text-4xl lg:text-5xl">
                Work faster, with a cleaner flow.
              </h1>

              <p className="app-text-muted mt-4 max-w-2xl text-base sm:text-lg">
                Main BRaD workspace is now centered around simple actions: find opportunities, track progress, and communicate without jumping between unclear screens.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="app-kpi-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#526347]">Workspace</p>
                <p className="mt-2 text-xl font-extrabold text-[#1F2B18]">Candidate + HR</p>
              </div>
              <div className="app-kpi-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#526347]">Navigation</p>
                <p className="mt-2 text-xl font-extrabold text-[#1F2B18]">Role-based</p>
              </div>
              <div className="app-kpi-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#526347]">Chat</p>
                <p className="mt-2 text-xl font-extrabold text-[#1F2B18]">Realtime</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="app-title text-2xl sm:text-3xl">Quick actions</h2>
            <Link to="/app/jobs" className="app-text-muted text-sm font-semibold hover:underline">
              Open vacancies
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link key={action.to} to={action.to} className="app-section-card app-lift block p-5 sm:p-6">
                  <div className="mb-4 inline-flex rounded-2xl bg-[#E8F0D8] p-3 text-[#24442E]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="app-title text-lg">{action.title}</h3>
                  <p className="app-text-muted mt-2 text-sm leading-6">{action.description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#2B6A4D]">
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {!isAuthenticated && (
          <section className="mt-6 app-section-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <h3 className="app-title text-xl">Sign in to unlock full workflow</h3>
              <p className="app-text-muted mt-2 text-sm sm:text-base">
                Applications, profile editing, invites, and messaging become available after login.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/app/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
              <Link to="/app/register">
                <Button variant="hero" size="lg">
                  Create Account
                </Button>
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
