import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'light' | 'dark';
export type Locale = 'en' | 'ru' | 'kk';

type TranslationValues = Record<string, string | number>;

interface UISettingsContextValue {
  theme: ThemeMode;
  locale: Locale;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: TranslationValues) => string;
}

const THEME_STORAGE_KEY = 'brad-theme';
const LOCALE_STORAGE_KEY = 'brad-locale';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    'preferences.theme': 'Theme',
    'preferences.language': 'Language',
    'preferences.light': 'Light',
    'preferences.dark': 'Dark',

    'nav.dashboard': 'Dashboard',
    'nav.jobs': 'Jobs',
    'nav.applications': 'Applications',
    'nav.profile': 'Profile',
    'nav.employer': 'Employer',
    'nav.operations': 'Operations',
    'nav.notifications': 'Notifications',
    'nav.messages': 'Messages',
    'nav.logout': 'Logout',
    'nav.signIn': 'Sign In',
    'nav.createAccount': 'Create Account',

    'app.badge': 'Main Workspace',
    'app.title': 'Work faster, with a cleaner flow.',
    'app.description':
      'Main BRaD workspace is now centered around simple actions: find opportunities, track progress, and communicate without jumping between unclear screens.',
    'app.workspaceLabel': 'Workspace',
    'app.workspaceValue': 'Candidate + HR',
    'app.navigationLabel': 'Navigation',
    'app.navigationValue': 'Role-based',
    'app.chatLabel': 'Chat',
    'app.chatValue': 'Realtime',
    'app.quickActions': 'Quick actions',
    'app.openVacancies': 'Open vacancies',
    'app.quick.exploreJobs.title': 'Explore jobs',
    'app.quick.exploreJobs.description': 'Use filters, compare roles, open details and apply in one flow.',
    'app.quick.trackApplications.title': 'Track applications',
    'app.quick.trackApplications.description':
      'See status timeline, updates, and move faster through hiring stages.',
    'app.quick.updateProfile.title': 'Update profile',
    'app.quick.updateProfile.description':
      'Keep CV, links, and personal details ready before HR reaches out.',
    'app.quick.manageVacancies.title': 'Manage vacancies',
    'app.quick.manageVacancies.description':
      'Create vacancies step by step and invite candidates directly from shortlist.',
    'app.quick.operations.title': 'Operations panel',
    'app.quick.operations.description':
      'Moderate users, control vacancy states, and keep platform healthy.',
    'app.quick.messages.title': 'Open messages',
    'app.quick.messages.description':
      'Continue candidate-HR conversations linked to active applications.',
    'app.open': 'Open',
    'app.signInTitle': 'Sign in to unlock full workflow',
    'app.signInDescription':
      'Applications, profile editing, invites, and messaging become available after login.',

    'jobs.badge': 'Talent Marketplace',
    'jobs.title': 'Find roles and explore companies',
    'jobs.description':
      'Switch between vacancy discovery and company search, then open the roles that fit you best.',
    'jobs.availableNow': 'Available now',
    'jobs.vacancies': 'Vacancies',
    'jobs.companies': 'Companies',
    'jobs.step1Title': 'Set filters',
    'jobs.step1Description': 'Role, location, and skills narrow the feed fast.',
    'jobs.step2Title': 'Open details',
    'jobs.step2Description': 'Check requirements and save interesting roles.',
    'jobs.step3Title': 'Apply and track',
    'jobs.step3Description': 'All responses are visible in Applications and Chat.',
    'jobs.companySearch.title': 'Company Search',
    'jobs.companySearch.description':
      'Find a company by name, check how many open vacancies it has, and open any role directly.',
    'jobs.companySearch.label': 'Search companies',
    'jobs.companySearch.placeholder': 'Company name, vacancy title, location, skill',
    'jobs.companySearch.found': 'Companies found',
    'jobs.companySearch.openVacancies': 'Open vacancies',
    'jobs.companySearch.selectedCompany': 'Selected company',
    'jobs.companySearch.availableVacancies': 'vacancies available',
    'jobs.companySearch.emptyTitle': 'No companies matched your search',
    'jobs.companySearch.emptyDescription': 'Try another company name, skill, or vacancy title.',
    'jobs.companySearch.companyProfile': 'Company profile',
    'jobs.companySearch.openRoles': 'Open roles',
    'jobs.companySearch.openRolesDescription': 'Open roles published by this company right now.',
    'jobs.viewVacancy': 'View vacancy',
    'jobs.backToWorkspace': 'Back to workspace',

    'auth.login.title': 'Welcome back',
    'auth.login.description': 'Sign in to continue in BRaD workspace.',
    'auth.login.email': 'Email',
    'auth.login.password': 'Password',
    'auth.login.forgotPassword': 'Forgot password?',
    'auth.login.submit': 'Sign In',
    'auth.login.submitting': 'Signing in...',
    'auth.login.noAccount': "Don't have an account?",
    'auth.login.signUp': 'Sign up',
    'auth.login.adminCredentials': 'Admin login: admin@mail.ru / 123456',

    'auth.register.title': 'Create account',
    'auth.register.description': 'Start with BRaD in less than a minute.',
    'auth.register.name': 'Full name',
    'auth.register.email': 'Email',
    'auth.register.password': 'Password',
    'auth.register.role': 'Account type',
    'auth.register.candidate': 'Candidate',
    'auth.register.hr': 'HR',
    'auth.register.submit': 'Create Account',
    'auth.register.submitting': 'Creating account...',
    'auth.register.hasAccount': 'Already have an account?',
    'auth.register.signIn': 'Sign in',

    'auth.forgot.title': 'Reset password',
    'auth.forgot.description': 'Enter email and we will send a verification code.',
    'auth.forgot.submit': 'Send reset code',
    'auth.forgot.submitting': 'Sending...',
    'auth.forgot.rememberPassword': 'Remember your password?',
    'auth.forgot.backToLogin': 'Back to login',
    'auth.forgot.successTitle': 'Check your email',
    'auth.forgot.successDescription': 'We sent a reset code to {email}',
    'auth.forgot.enterCode': 'Enter reset code',

    'auth.reset.title': 'Set new password',
    'auth.reset.description': 'Enter the code sent to {email} and choose a new password.',
    'auth.reset.code': 'Reset code',
    'auth.reset.newPassword': 'New password',
    'auth.reset.confirmPassword': 'Confirm new password',
    'auth.reset.submit': 'Reset password',
    'auth.reset.submitting': 'Saving...',
    'auth.reset.resendCode': 'Resend code',
    'auth.reset.or': 'or',
    'auth.reset.successTitle': 'Password updated',
    'auth.reset.successDescription': 'Redirecting to login...',

    'auth.verify.title': 'Verify email',
    'auth.verify.description': 'Enter the code sent to {email}',
    'auth.verify.code': 'Verification code',
    'auth.verify.submit': 'Verify email',
    'auth.verify.submitting': 'Verifying...',
    'auth.verify.noCode': "Didn't receive the code?",
    'auth.verify.successTitle': 'Email verified',
    'auth.verify.successDescription': 'Redirecting to workspace...',

    'employer.title': 'HR Dashboard',
    'employer.description': 'Create vacancies with step-by-step workflow and publish when all sections are complete.',
    'employer.createVacancy': 'Create Vacancy',
    'employer.accessDenied': 'Access Denied',
    'employer.accessDescription': 'This page is available only for HR and employer accounts.',
    'employer.yourVacancies': 'Your Vacancies',
    'employer.noVacancies': 'No vacancies yet',
    'employer.noVacanciesDescription': 'Create a vacancy in one form and publish when ready.',
    'employer.createFirstVacancy': 'Create first vacancy',
    'employer.findCandidates': 'Find candidates',
    'employer.searchUsersTitle': 'Search Users By Vacancy',
    'employer.searchUsersDescription':
      'Type a vacancy title like Frontend Developer, choose the right role, and open matching candidates.',
    'employer.refreshMatches': 'Refresh matches',
    'employer.searchByVacancy': 'Search by vacancy title',
    'employer.searchByVacancyPlaceholder': 'Frontend Developer, QA Engineer, Product Designer',
    'employer.interviewDate': 'Interview date and time',
    'employer.searchUsers': 'Search users',
    'employer.chooseVacancy': 'Choose vacancy',
    'employer.vacanciesMatched': '{count} vacancies matched your search',
    'employer.vacanciesMatchedEmpty': 'No vacancies matched that title',

    'admin.badge': 'Admin mode',
    'admin.title': 'Admin workspace',
    'admin.description':
      'Keep the admin experience focused: one tab for high-level statistics and one tab for day-to-day operations.',
    'admin.statistics': 'Statistics',
    'admin.operations': 'Operations',
    'admin.userManagement': 'User management',
    'admin.userManagementDescription':
      'Change roles, adjust statuses, and quickly ban or unban accounts.',
    'admin.vacancyOperations': 'Vacancy operations',
    'admin.vacancyOperationsDescription':
      'Archive, soft delete, and restore vacancies from one place.',
    'admin.complianceOperations': 'Compliance operations',
    'admin.complianceOperationsDescription':
      'Review KYC submissions, moderate complaints, and process account deletion requests.',
    'admin.accessTitle': 'Admin workspace is limited to admins',
    'admin.accessDescription':
      'This workspace uses protected backend endpoints for moderation, vacancy controls, and compliance review.',

    'applications.accessTitle': 'Applications are available after sign in',
    'applications.accessDescription':
      'Candidates can manage their own applications. HR and admins can review and update application statuses.',
    'applications.signIn': 'Sign In',
    'applications.browseJobs': 'Browse Jobs',
    'applications.scopeAdmin': 'Admin mode',
    'applications.scopeHr': 'HR mode',
    'applications.scopeCandidate': 'Candidate mode',
    'applications.titleCandidate': 'Track your applications',
    'applications.titleTeam': 'Review candidate pipeline',
    'applications.descriptionCandidate':
      'See statuses, open timeline events, and withdraw active applications when needed.',
    'applications.descriptionTeam':
      'Filter applications by vacancy, candidate, dates, and keep the pipeline moving without leaving the frontend.',
    'applications.loaded': 'Loaded',
    'applications.total': 'Total',
    'applications.pageSize': 'Page Size',
    'applications.step1Title': 'Apply filters',
    'applications.step1Description': 'Narrow by status, people, and time period.',
    'applications.step2Title': 'Open application',
    'applications.step2Description': 'Read cover letter, resume, and timeline in one pane.',
    'applications.step3Title': 'Decide next action',
    'applications.step3Description': 'Update status or continue discussion in chat.',
    'applications.activeFilters': 'Active filters',
    'applications.resetLocalFilters': 'Reset local filters',
    'applications.filter.status': 'Status',
    'applications.filter.vacancyId': 'Vacancy ID',
    'applications.filter.candidateId': 'Candidate ID',
    'applications.filter.hrUserId': 'HR User ID',
    'applications.filter.dateFrom': 'Date From',
    'applications.filter.dateTo': 'Date To',
    'applications.allStatuses': 'All statuses',
    'applications.refresh': 'Refresh',
    'applications.reset': 'Reset',
    'applications.listTitle': 'Application list',
    'applications.listDescriptionCandidate': 'Your submissions and their current statuses.',
    'applications.listDescriptionTeam': 'Applications available in your access scope.',
    'applications.loading': 'Loading applications...',
    'applications.emptyTitle': 'No applications found',
    'applications.emptyDescriptionCandidate':
      'Apply to a published vacancy and it will appear here with full timeline history.',
    'applications.emptyDescriptionTeam':
      'Try adjusting filters or reload the page after new applications arrive.',
  },
  ru: {
    'preferences.theme': 'Тема',
    'preferences.language': 'Язык',
    'preferences.light': 'Светлая',
    'preferences.dark': 'Тёмная',

    'nav.dashboard': 'Главная',
    'nav.jobs': 'Вакансии',
    'nav.applications': 'Отклики',
    'nav.profile': 'Профиль',
    'nav.employer': 'HR',
    'nav.operations': 'Операции',
    'nav.notifications': 'Уведомления',
    'nav.messages': 'Сообщения',
    'nav.logout': 'Выйти',
    'nav.signIn': 'Войти',
    'nav.createAccount': 'Регистрация',

    'app.badge': 'Рабочее пространство',
    'app.title': 'Работать быстрее и понятнее.',
    'app.description':
      'Основное пространство BRaD теперь собрано вокруг простых действий: искать возможности, отслеживать прогресс и общаться без лишних экранов.',
    'app.workspaceLabel': 'Формат',
    'app.workspaceValue': 'Кандидат + HR',
    'app.navigationLabel': 'Навигация',
    'app.navigationValue': 'По ролям',
    'app.chatLabel': 'Чат',
    'app.chatValue': 'В реальном времени',
    'app.quickActions': 'Быстрые действия',
    'app.openVacancies': 'Открыть вакансии',
    'app.quick.exploreJobs.title': 'Искать вакансии',
    'app.quick.exploreJobs.description': 'Фильтруйте, сравнивайте роли, открывайте детали и откликайтесь в одном потоке.',
    'app.quick.trackApplications.title': 'Отслеживать отклики',
    'app.quick.trackApplications.description': 'Смотрите статусы, обновления и двигайтесь по найму быстрее.',
    'app.quick.updateProfile.title': 'Обновить профиль',
    'app.quick.updateProfile.description': 'Держите CV, ссылки и данные в порядке, пока HR ищет кандидатов.',
    'app.quick.manageVacancies.title': 'Управлять вакансиями',
    'app.quick.manageVacancies.description': 'Создавайте вакансии пошагово и приглашайте кандидатов прямо из шортлиста.',
    'app.quick.operations.title': 'Панель операций',
    'app.quick.operations.description': 'Модерируйте пользователей, управляйте вакансиями и поддерживайте платформу.',
    'app.quick.messages.title': 'Открыть сообщения',
    'app.quick.messages.description': 'Продолжайте диалоги между кандидатом и HR по активным откликам.',
    'app.open': 'Открыть',
    'app.signInTitle': 'Войдите, чтобы открыть весь сценарий',
    'app.signInDescription':
      'После входа становятся доступны отклики, редактирование профиля, приглашения и сообщения.',

    'jobs.badge': 'Маркетплейс вакансий',
    'jobs.title': 'Ищите роли и изучайте компании',
    'jobs.description':
      'Переключайтесь между поиском вакансий и поиском компаний, а затем открывайте подходящие роли.',
    'jobs.availableNow': 'Доступно сейчас',
    'jobs.vacancies': 'Вакансии',
    'jobs.companies': 'Компании',
    'jobs.step1Title': 'Настройте фильтры',
    'jobs.step1Description': 'Роль, локация и навыки быстро сужают выдачу.',
    'jobs.step2Title': 'Откройте детали',
    'jobs.step2Description': 'Проверьте требования и сохраните интересные роли.',
    'jobs.step3Title': 'Откликайтесь и отслеживайте',
    'jobs.step3Description': 'Все ответы видны в Откликах и Чате.',
    'jobs.companySearch.title': 'Поиск компаний',
    'jobs.companySearch.description':
      'Найдите компанию по названию, посмотрите количество открытых вакансий и откройте нужную роль.',
    'jobs.companySearch.label': 'Искать компании',
    'jobs.companySearch.placeholder': 'Название компании, вакансия, локация, навык',
    'jobs.companySearch.found': 'Найдено компаний',
    'jobs.companySearch.openVacancies': 'Открытых вакансий',
    'jobs.companySearch.selectedCompany': 'Выбранная компания',
    'jobs.companySearch.availableVacancies': 'вакансий доступно',
    'jobs.companySearch.emptyTitle': 'Компании не найдены',
    'jobs.companySearch.emptyDescription': 'Попробуйте другое название компании, навык или роль.',
    'jobs.companySearch.companyProfile': 'Профиль компании',
    'jobs.companySearch.openRoles': 'Открытые роли',
    'jobs.companySearch.openRolesDescription': 'Открытые роли, опубликованные этой компанией прямо сейчас.',
    'jobs.viewVacancy': 'Открыть вакансию',
    'jobs.backToWorkspace': 'Назад в workspace',

    'auth.login.title': 'С возвращением',
    'auth.login.description': 'Войдите, чтобы продолжить работу в BRaD.',
    'auth.login.email': 'Email',
    'auth.login.password': 'Пароль',
    'auth.login.forgotPassword': 'Забыли пароль?',
    'auth.login.submit': 'Войти',
    'auth.login.submitting': 'Вход...',
    'auth.login.noAccount': 'Нет аккаунта?',
    'auth.login.signUp': 'Зарегистрироваться',
    'auth.login.adminCredentials': 'Логин администратора: admin@mail.ru / 123456',

    'auth.register.title': 'Создать аккаунт',
    'auth.register.description': 'Начните работу с BRaD меньше чем за минуту.',
    'auth.register.name': 'Полное имя',
    'auth.register.email': 'Email',
    'auth.register.password': 'Пароль',
    'auth.register.role': 'Тип аккаунта',
    'auth.register.candidate': 'Кандидат',
    'auth.register.hr': 'HR',
    'auth.register.submit': 'Создать аккаунт',
    'auth.register.submitting': 'Создание аккаунта...',
    'auth.register.hasAccount': 'Уже есть аккаунт?',
    'auth.register.signIn': 'Войти',

    'auth.forgot.title': 'Сброс пароля',
    'auth.forgot.description': 'Введите email, и мы отправим код подтверждения.',
    'auth.forgot.submit': 'Отправить код',
    'auth.forgot.submitting': 'Отправка...',
    'auth.forgot.rememberPassword': 'Помните пароль?',
    'auth.forgot.backToLogin': 'Назад ко входу',
    'auth.forgot.successTitle': 'Проверьте почту',
    'auth.forgot.successDescription': 'Мы отправили код сброса на {email}',
    'auth.forgot.enterCode': 'Ввести код',

    'auth.reset.title': 'Новый пароль',
    'auth.reset.description': 'Введите код, отправленный на {email}, и задайте новый пароль.',
    'auth.reset.code': 'Код сброса',
    'auth.reset.newPassword': 'Новый пароль',
    'auth.reset.confirmPassword': 'Подтвердите пароль',
    'auth.reset.submit': 'Сбросить пароль',
    'auth.reset.submitting': 'Сохранение...',
    'auth.reset.resendCode': 'Отправить код заново',
    'auth.reset.or': 'или',
    'auth.reset.successTitle': 'Пароль обновлён',
    'auth.reset.successDescription': 'Перенаправляем на страницу входа...',

    'auth.verify.title': 'Подтвердить email',
    'auth.verify.description': 'Введите код, отправленный на {email}',
    'auth.verify.code': 'Код подтверждения',
    'auth.verify.submit': 'Подтвердить email',
    'auth.verify.submitting': 'Проверка...',
    'auth.verify.noCode': 'Код не пришёл?',
    'auth.verify.successTitle': 'Email подтверждён',
    'auth.verify.successDescription': 'Перенаправляем в workspace...',

    'employer.title': 'HR панель',
    'employer.description': 'Создавайте вакансии пошагово и публикуйте их, когда все разделы готовы.',
    'employer.createVacancy': 'Создать вакансию',
    'employer.accessDenied': 'Доступ запрещён',
    'employer.accessDescription': 'Эта страница доступна только HR и работодателям.',
    'employer.yourVacancies': 'Ваши вакансии',
    'employer.noVacancies': 'Пока нет вакансий',
    'employer.noVacanciesDescription': 'Создайте вакансию в одной форме и опубликуйте, когда будете готовы.',
    'employer.createFirstVacancy': 'Создать первую вакансию',
    'employer.findCandidates': 'Найти кандидатов',
    'employer.searchUsersTitle': 'Поиск пользователей по вакансии',
    'employer.searchUsersDescription':
      'Введите название вакансии, например Frontend Developer, выберите нужную роль и откройте подходящих кандидатов.',
    'employer.refreshMatches': 'Обновить подбор',
    'employer.searchByVacancy': 'Поиск по названию вакансии',
    'employer.searchByVacancyPlaceholder': 'Frontend Developer, QA Engineer, Product Designer',
    'employer.interviewDate': 'Дата и время интервью',
    'employer.searchUsers': 'Найти пользователей',
    'employer.chooseVacancy': 'Выберите вакансию',
    'employer.vacanciesMatched': 'По запросу найдено вакансий: {count}',
    'employer.vacanciesMatchedEmpty': 'По такому названию вакансии не найдены',

    'admin.badge': 'Режим администратора',
    'admin.title': 'Рабочее пространство администратора',
    'admin.description':
      'Админский интерфейс теперь сфокусирован: одна вкладка для статистики и одна для ежедневных операций.',
    'admin.statistics': 'Статистика',
    'admin.operations': 'Операции',
    'admin.userManagement': 'Управление пользователями',
    'admin.userManagementDescription':
      'Меняйте роли, статусы и быстро блокируйте или разблокируйте аккаунты.',
    'admin.vacancyOperations': 'Операции с вакансиями',
    'admin.vacancyOperationsDescription':
      'Архивируйте, мягко удаляйте и восстанавливайте вакансии в одном месте.',
    'admin.complianceOperations': 'Операции compliance',
    'admin.complianceOperationsDescription':
      'Проверяйте KYC, модерируйте жалобы и обрабатывайте запросы на удаление аккаунтов.',
    'admin.accessTitle': 'Админское пространство доступно только администраторам',
    'admin.accessDescription':
      'Это пространство использует защищённые backend-endpointы для модерации, контроля вакансий и compliance-проверок.',

    'applications.accessTitle': 'Отклики доступны после входа',
    'applications.accessDescription':
      'Кандидаты могут управлять своими откликами. HR и админы могут просматривать и менять статусы.',
    'applications.signIn': 'Войти',
    'applications.browseJobs': 'Смотреть вакансии',
    'applications.scopeAdmin': 'Режим администратора',
    'applications.scopeHr': 'HR режим',
    'applications.scopeCandidate': 'Режим кандидата',
    'applications.titleCandidate': 'Отслеживайте свои отклики',
    'applications.titleTeam': 'Просматривайте воронку кандидатов',
    'applications.descriptionCandidate':
      'Смотрите статусы, события таймлайна и при необходимости снимайте активные отклики.',
    'applications.descriptionTeam':
      'Фильтруйте отклики по вакансии, кандидату и датам, не выходя из фронтенда.',
    'applications.loaded': 'Загружено',
    'applications.total': 'Всего',
    'applications.pageSize': 'Размер страницы',
    'applications.step1Title': 'Примените фильтры',
    'applications.step1Description': 'Сузьте список по статусу, людям и периоду времени.',
    'applications.step2Title': 'Откройте отклик',
    'applications.step2Description': 'Читайте письмо, резюме и таймлайн в одной панели.',
    'applications.step3Title': 'Выберите следующее действие',
    'applications.step3Description': 'Обновите статус или продолжайте общение в чате.',
    'applications.activeFilters': 'Активные фильтры',
    'applications.resetLocalFilters': 'Сбросить локальные фильтры',
    'applications.filter.status': 'Статус',
    'applications.filter.vacancyId': 'ID вакансии',
    'applications.filter.candidateId': 'ID кандидата',
    'applications.filter.hrUserId': 'ID HR пользователя',
    'applications.filter.dateFrom': 'Дата от',
    'applications.filter.dateTo': 'Дата до',
    'applications.allStatuses': 'Все статусы',
    'applications.refresh': 'Обновить',
    'applications.reset': 'Сбросить',
    'applications.listTitle': 'Список откликов',
    'applications.listDescriptionCandidate': 'Ваши отклики и их текущие статусы.',
    'applications.listDescriptionTeam': 'Отклики, доступные в вашей зоне доступа.',
    'applications.loading': 'Загрузка откликов...',
    'applications.emptyTitle': 'Отклики не найдены',
    'applications.emptyDescriptionCandidate':
      'Откликнитесь на опубликованную вакансию, и она появится здесь вместе с полной историей.',
    'applications.emptyDescriptionTeam':
      'Попробуйте изменить фильтры или обновить страницу после поступления новых откликов.',
  },
  kk: {
    'preferences.theme': 'Тақырып',
    'preferences.language': 'Тіл',
    'preferences.light': 'Жарық',
    'preferences.dark': 'Қараңғы',

    'nav.dashboard': 'Басты бет',
    'nav.jobs': 'Вакансиялар',
    'nav.applications': 'Өтінімдер',
    'nav.profile': 'Профиль',
    'nav.employer': 'HR',
    'nav.operations': 'Операциялар',
    'nav.notifications': 'Хабарламалар',
    'nav.messages': 'Чат',
    'nav.logout': 'Шығу',
    'nav.signIn': 'Кіру',
    'nav.createAccount': 'Тіркелу',

    'app.badge': 'Жұмыс кеңістігі',
    'app.title': 'Тезірек және түсініктірек жұмыс істеңіз.',
    'app.description':
      'BRaD негізгі кеңістігі енді қарапайым әрекеттерге құрылған: мүмкіндік іздеу, прогресті бақылау және артық экрансыз байланысу.',
    'app.workspaceLabel': 'Кеңістік',
    'app.workspaceValue': 'Кандидат + HR',
    'app.navigationLabel': 'Навигация',
    'app.navigationValue': 'Рөл бойынша',
    'app.chatLabel': 'Чат',
    'app.chatValue': 'Нақты уақыт',
    'app.quickActions': 'Жылдам әрекеттер',
    'app.openVacancies': 'Вакансияларды ашу',
    'app.quick.exploreJobs.title': 'Вакансия іздеу',
    'app.quick.exploreJobs.description':
      'Сүзгілерді қолданып, рөлдерді салыстырып, толық ақпарат ашып, бір ағында өтініш беріңіз.',
    'app.quick.trackApplications.title': 'Өтінімдерді бақылау',
    'app.quick.trackApplications.description':
      'Статустарды, жаңартуларды көріп, іріктеу процесін жылдамдатыңыз.',
    'app.quick.updateProfile.title': 'Профильді жаңарту',
    'app.quick.updateProfile.description':
      'HR хабарласқанша CV, сілтемелер және жеке деректер дайын болсын.',
    'app.quick.manageVacancies.title': 'Вакансияларды басқару',
    'app.quick.manageVacancies.description':
      'Вакансияларды кезең-кезеңімен жасап, кандидаттарды shortlist-тен тікелей шақырыңыз.',
    'app.quick.operations.title': 'Операциялар панелі',
    'app.quick.operations.description':
      'Пайдаланушыларды модерациялап, вакансия күйлерін басқарып, платформаны тұрақты ұстаңыз.',
    'app.quick.messages.title': 'Хабарламаларды ашу',
    'app.quick.messages.description':
      'Белсенді өтінімдерге байланысты кандидат пен HR арасындағы сөйлесуді жалғастырыңыз.',
    'app.open': 'Ашу',
    'app.signInTitle': 'Толық сценарийді ашу үшін кіріңіз',
    'app.signInDescription':
      'Кіргеннен кейін өтінімдер, профильді өңдеу, шақырулар және хабарламалар қолжетімді болады.',

    'jobs.badge': 'Вакансиялар алаңы',
    'jobs.title': 'Рөлдерді тауып, компанияларды зерттеңіз',
    'jobs.description':
      'Вакансия іздеу мен компания іздеу арасында ауысып, өзіңізге сай рөлдерді ашыңыз.',
    'jobs.availableNow': 'Қазір қолжетімді',
    'jobs.vacancies': 'Вакансиялар',
    'jobs.companies': 'Компаниялар',
    'jobs.step1Title': 'Сүзгілерді орнатыңыз',
    'jobs.step1Description': 'Рөл, локация және дағдылар нәтижені жылдам тарылтады.',
    'jobs.step2Title': 'Толық ақпаратты ашыңыз',
    'jobs.step2Description': 'Талаптарды қарап, қызық рөлдерді сақтаңыз.',
    'jobs.step3Title': 'Өтініш беріп, бақылаңыз',
    'jobs.step3Description': 'Барлық жауаптар Өтінімдер мен Чатта көрінеді.',
    'jobs.companySearch.title': 'Компания іздеу',
    'jobs.companySearch.description':
      'Компанияны атауы бойынша тауып, ашық вакансияларын қарап, керекті рөлді бірден ашыңыз.',
    'jobs.companySearch.label': 'Компания іздеу',
    'jobs.companySearch.placeholder': 'Компания атауы, вакансия, локация, дағды',
    'jobs.companySearch.found': 'Табылған компаниялар',
    'jobs.companySearch.openVacancies': 'Ашық вакансиялар',
    'jobs.companySearch.selectedCompany': 'Таңдалған компания',
    'jobs.companySearch.availableVacancies': 'вакансия қолжетімді',
    'jobs.companySearch.emptyTitle': 'Сұранысқа сай компания табылмады',
    'jobs.companySearch.emptyDescription': 'Басқа компания атауын, дағдыны немесе рөлді қолданып көріңіз.',
    'jobs.companySearch.companyProfile': 'Компания профилі',
    'jobs.companySearch.openRoles': 'Ашық рөлдер',
    'jobs.companySearch.openRolesDescription': 'Осы компания дәл қазір жариялаған ашық рөлдер.',
    'jobs.viewVacancy': 'Вакансияны ашу',
    'jobs.backToWorkspace': 'Жұмыс кеңістігіне оралу',

    'auth.login.title': 'Қайта келгеніңізге қуаныштымыз',
    'auth.login.description': 'BRaD кеңістігінде жалғастыру үшін кіріңіз.',
    'auth.login.email': 'Email',
    'auth.login.password': 'Құпиясөз',
    'auth.login.forgotPassword': 'Құпиясөзді ұмыттыңыз ба?',
    'auth.login.submit': 'Кіру',
    'auth.login.submitting': 'Кіру...',
    'auth.login.noAccount': 'Аккаунтыңыз жоқ па?',
    'auth.login.signUp': 'Тіркелу',
    'auth.login.adminCredentials': 'Әкімші логині: admin@mail.ru / 123456',

    'auth.register.title': 'Аккаунт жасау',
    'auth.register.description': 'BRaD-пен жұмысты бір минутқа жетпей бастаңыз.',
    'auth.register.name': 'Толық аты-жөні',
    'auth.register.email': 'Email',
    'auth.register.password': 'Құпиясөз',
    'auth.register.role': 'Аккаунт түрі',
    'auth.register.candidate': 'Кандидат',
    'auth.register.hr': 'HR',
    'auth.register.submit': 'Аккаунт жасау',
    'auth.register.submitting': 'Аккаунт жасалуда...',
    'auth.register.hasAccount': 'Аккаунтыңыз бар ма?',
    'auth.register.signIn': 'Кіру',

    'auth.forgot.title': 'Құпиясөзді қалпына келтіру',
    'auth.forgot.description': 'Email енгізіңіз, біз растау кодын жібереміз.',
    'auth.forgot.submit': 'Қалпына келтіру кодын жіберу',
    'auth.forgot.submitting': 'Жіберілуде...',
    'auth.forgot.rememberPassword': 'Құпиясөз есіңізде ме?',
    'auth.forgot.backToLogin': 'Кіру бетіне оралу',
    'auth.forgot.successTitle': 'Поштаңызды тексеріңіз',
    'auth.forgot.successDescription': 'Қалпына келтіру коды {email} адресіне жіберілді',
    'auth.forgot.enterCode': 'Кодты енгізу',

    'auth.reset.title': 'Жаңа құпиясөз орнату',
    'auth.reset.description': '{email} поштасына жіберілген кодты енгізіп, жаңа құпиясөз таңдаңыз.',
    'auth.reset.code': 'Қалпына келтіру коды',
    'auth.reset.newPassword': 'Жаңа құпиясөз',
    'auth.reset.confirmPassword': 'Жаңа құпиясөзді растау',
    'auth.reset.submit': 'Құпиясөзді жаңарту',
    'auth.reset.submitting': 'Сақталуда...',
    'auth.reset.resendCode': 'Кодты қайта жіберу',
    'auth.reset.or': 'немесе',
    'auth.reset.successTitle': 'Құпиясөз жаңартылды',
    'auth.reset.successDescription': 'Кіру бетіне бағытталуда...',

    'auth.verify.title': 'Email растау',
    'auth.verify.description': '{email} адресіне жіберілген кодты енгізіңіз',
    'auth.verify.code': 'Растау коды',
    'auth.verify.submit': 'Email растау',
    'auth.verify.submitting': 'Тексерілуде...',
    'auth.verify.noCode': 'Код келмеді ме?',
    'auth.verify.successTitle': 'Email расталды',
    'auth.verify.successDescription': 'Жұмыс кеңістігіне бағытталуда...',

    'employer.title': 'HR панелі',
    'employer.description':
      'Вакансияларды қадамдап жасап, барлық бөлім дайын болған кезде жариялаңыз.',
    'employer.createVacancy': 'Вакансия жасау',
    'employer.accessDenied': 'Қолжетімсіз',
    'employer.accessDescription': 'Бұл бет тек HR және жұмыс беруші аккаунттарына қолжетімді.',
    'employer.yourVacancies': 'Сіздің вакансияларыңыз',
    'employer.noVacancies': 'Әзірге вакансия жоқ',
    'employer.noVacanciesDescription': 'Бір формада вакансия жасап, дайын болғанда жариялаңыз.',
    'employer.createFirstVacancy': 'Алғашқы вакансияны жасау',
    'employer.findCandidates': 'Кандидаттарды табу',
    'employer.searchUsersTitle': 'Вакансия бойынша пайдаланушы іздеу',
    'employer.searchUsersDescription':
      'Мысалы, Frontend Developer сияқты вакансия атауын енгізіп, қажет рөлді таңдап, сәйкес кандидаттарды ашыңыз.',
    'employer.refreshMatches': 'Сәйкестікті жаңарту',
    'employer.searchByVacancy': 'Вакансия атауы бойынша іздеу',
    'employer.searchByVacancyPlaceholder': 'Frontend Developer, QA Engineer, Product Designer',
    'employer.interviewDate': 'Сұхбат күні мен уақыты',
    'employer.searchUsers': 'Пайдаланушыларды табу',
    'employer.chooseVacancy': 'Вакансияны таңдаңыз',
    'employer.vacanciesMatched': 'Сұраныс бойынша табылған вакансия саны: {count}',
    'employer.vacanciesMatchedEmpty': 'Мұндай атаумен вакансия табылмады',

    'admin.badge': 'Әкімші режимі',
    'admin.title': 'Әкімші жұмыс кеңістігі',
    'admin.description':
      'Әкімші интерфейсі енді нақтырақ: бір вкладка статистикаға, бір вкладка күнделікті операцияларға.',
    'admin.statistics': 'Статистика',
    'admin.operations': 'Операциялар',
    'admin.userManagement': 'Пайдаланушыларды басқару',
    'admin.userManagementDescription':
      'Рөлдерді, статустарды өзгертіп, аккаунттарды жылдам бұғаттаңыз немесе ашыңыз.',
    'admin.vacancyOperations': 'Вакансия операциялары',
    'admin.vacancyOperationsDescription':
      'Вакансияларды архивтеңіз, жұмсақ өшіріңіз және қалпына келтіріңіз.',
    'admin.complianceOperations': 'Compliance операциялары',
    'admin.complianceOperationsDescription':
      'KYC тексеріп, шағымдарды модерациялап, аккаунтты өшіру сұраныстарын өңдеңіз.',
    'admin.accessTitle': 'Әкімші кеңістігі тек әкімшілерге қолжетімді',
    'admin.accessDescription':
      'Бұл кеңістік модерация, вакансияларды бақылау және compliance тексерулері үшін қорғалған backend endpoint-терді қолданады.',

    'applications.accessTitle': 'Өтінімдер кіруден кейін қолжетімді',
    'applications.accessDescription':
      'Кандидаттар өз өтінімдерін басқара алады. HR мен әкімшілер оларды қарап, статустарын өзгерте алады.',
    'applications.signIn': 'Кіру',
    'applications.browseJobs': 'Вакансияларды қарау',
    'applications.scopeAdmin': 'Әкімші режимі',
    'applications.scopeHr': 'HR режимі',
    'applications.scopeCandidate': 'Кандидат режимі',
    'applications.titleCandidate': 'Өтінімдеріңізді бақылаңыз',
    'applications.titleTeam': 'Кандидаттар воронкасын қараңыз',
    'applications.descriptionCandidate':
      'Мәртебелерді, таймлайн оқиғаларын көріп, қажет болса белсенді өтінімдерді қайтарып алыңыз.',
    'applications.descriptionTeam':
      'Өтінімдерді вакансия, кандидат және күн бойынша сүзгілеп, бәрін фронтендтен басқарыңыз.',
    'applications.loaded': 'Жүктелгені',
    'applications.total': 'Барлығы',
    'applications.pageSize': 'Бет өлшемі',
    'applications.step1Title': 'Сүзгілерді қолданыңыз',
    'applications.step1Description': 'Тізімді мәртебе, адамдар және уақыт бойынша тарылтыңыз.',
    'applications.step2Title': 'Өтінімді ашыңыз',
    'applications.step2Description': 'Хат, түйіндеме және таймлайнды бір панельден оқыңыз.',
    'applications.step3Title': 'Келесі әрекетті таңдаңыз',
    'applications.step3Description': 'Мәртебені жаңартыңыз немесе чатта сөйлесуді жалғастырыңыз.',
    'applications.activeFilters': 'Белсенді сүзгілер',
    'applications.resetLocalFilters': 'Жергілікті сүзгілерді тазалау',
    'applications.filter.status': 'Мәртебе',
    'applications.filter.vacancyId': 'Вакансия ID',
    'applications.filter.candidateId': 'Кандидат ID',
    'applications.filter.hrUserId': 'HR пайдаланушы ID',
    'applications.filter.dateFrom': 'Басталу күні',
    'applications.filter.dateTo': 'Аяқталу күні',
    'applications.allStatuses': 'Барлық мәртебе',
    'applications.refresh': 'Жаңарту',
    'applications.reset': 'Тазалау',
    'applications.listTitle': 'Өтінімдер тізімі',
    'applications.listDescriptionCandidate': 'Сіздің өтінімдеріңіз және олардың ағымдағы мәртебелері.',
    'applications.listDescriptionTeam': 'Сіздің қолжетімділік аймағыңыздағы өтінімдер.',
    'applications.loading': 'Өтінімдер жүктелуде...',
    'applications.emptyTitle': 'Өтінімдер табылмады',
    'applications.emptyDescriptionCandidate':
      'Жарияланған вакансияға өтініш беріңіз, сонда ол толық тарихымен осында көрінеді.',
    'applications.emptyDescriptionTeam':
      'Жаңа өтінімдер түскеннен кейін сүзгілерді өзгертіп немесе бетті жаңартып көріңіз.',
  },
};

const localeLabels: Record<Locale, string> = {
  en: 'EN',
  ru: 'РУ',
  kk: 'ҚАЗ',
};

const UISettingsContext = createContext<UISettingsContextValue | null>(null);

const getSystemTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === 'dark' || value === 'light' ? value : getSystemTheme();
};

const getStoredLocale = (): Locale => {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return value === 'en' || value === 'ru' || value === 'kk' ? value : 'en';
};

const formatTranslation = (template: string, values?: TranslationValues): string => {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }, template);
};

export const UISettingsProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme);
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback(
    (key: string, values?: TranslationValues) => {
      const template = translations[locale][key] || translations.en[key] || key;
      return formatTranslation(template, values);
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      theme,
      locale,
      setTheme,
      toggleTheme,
      setLocale,
      t,
    }),
    [locale, setLocale, setTheme, t, theme, toggleTheme],
  );

  return <UISettingsContext.Provider value={value}>{children}</UISettingsContext.Provider>;
};

export const useUISettings = () => {
  const context = useContext(UISettingsContext);

  if (!context) {
    throw new Error('useUISettings must be used within UISettingsProvider');
  }

  return context;
};

export const getLocaleLabel = (locale: Locale) => localeLabels[locale];
