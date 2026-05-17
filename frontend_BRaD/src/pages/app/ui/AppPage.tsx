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
import { useUISettings } from '@shared/lib/ui-settings';

export const AppPage = () => {
  const { isAuthenticated, currentUser } = useUserStore();
  const { t } = useUISettings();
  const isHr = isHrRole(currentUser?.role);
  const isAdmin = isAdminRole(currentUser?.role);

  const quickActions = [
    {
      to: '/app/jobs',
      icon: Search,
      title: t('app.quick.exploreJobs.title'),
      description: t('app.quick.exploreJobs.description'),
    },
    {
      to: '/app/applications',
      icon: ClipboardList,
      title: t('app.quick.trackApplications.title'),
      description: t('app.quick.trackApplications.description'),
    },
    {
      to: '/app/profile',
      icon: Users,
      title: t('app.quick.updateProfile.title'),
      description: t('app.quick.updateProfile.description'),
    },
  ];

  if (isHr) {
    quickActions.push({
      to: '/app/employer',
      icon: Briefcase,
      title: t('app.quick.manageVacancies.title'),
      description: t('app.quick.manageVacancies.description'),
    });
  }

  if (isAdmin) {
    quickActions.push({
      to: '/app/admin',
      icon: Shield,
      title: t('app.quick.operations.title'),
      description: t('app.quick.operations.description'),
    });
  }

  if (isAuthenticated) {
    quickActions.push({
      to: '/app/chat',
      icon: MessageSquare,
      title: t('app.quick.messages.title'),
      description: t('app.quick.messages.description'),
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
                {t('app.badge')}
              </span>

              <h1 className="app-title text-3xl sm:text-4xl lg:text-5xl">
                {t('app.title')}
              </h1>

              <p className="app-text-muted mt-4 max-w-2xl text-base sm:text-lg">
                {t('app.description')}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="app-kpi-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#526347]">{t('app.workspaceLabel')}</p>
                <p className="mt-2 text-xl font-extrabold text-[#1F2B18]">{t('app.workspaceValue')}</p>
              </div>
              <div className="app-kpi-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#526347]">{t('app.navigationLabel')}</p>
                <p className="mt-2 text-xl font-extrabold text-[#1F2B18]">{t('app.navigationValue')}</p>
              </div>
              <div className="app-kpi-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#526347]">{t('app.chatLabel')}</p>
                <p className="mt-2 text-xl font-extrabold text-[#1F2B18]">{t('app.chatValue')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="app-title text-2xl sm:text-3xl">{t('app.quickActions')}</h2>
            <Link to="/app/jobs" className="app-text-muted text-sm font-semibold hover:underline">
              {t('app.openVacancies')}
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
                    {t('app.open')}
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
              <h3 className="app-title text-xl">{t('app.signInTitle')}</h3>
              <p className="app-text-muted mt-2 text-sm sm:text-base">
                {t('app.signInDescription')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/app/login">
                <Button variant="outline" size="lg">
                  {t('nav.signIn')}
                </Button>
              </Link>
              <Link to="/app/register">
                <Button variant="hero" size="lg">
                  {t('nav.createAccount')}
                </Button>
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
