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
    'applications.filter.dateFromShort': 'From',
    'applications.filter.dateToShort': 'To',
    'applications.error.loadList': 'Failed to load applications',
    'applications.error.loadSingle': 'Failed to load application',
    'applications.error.withdraw': 'Failed to withdraw application',
    'applications.error.updateStatus': 'Failed to update application status',
    'applications.error.openResume': 'Failed to open resume',
    'applications.viewCandidate': 'View candidate',
    'applications.openChat': 'Open chat',
    'applications.withdraw': 'Withdraw',
    'applications.fullView': 'Full application view',
    'applications.loadingDetails': 'Loading application details...',
    'applications.notFoundTitle': 'Application not found',
    'applications.notFoundDescription': 'This application is unavailable or no longer in your access scope.',
    'applications.openCandidateProfile': 'Open full candidate profile',
    'applications.chatDescription': 'Open the application chat to continue the conversation in realtime.',
    'applications.updateStatus': 'Update status',
    'applications.timelineNotePlaceholder': 'Optional note for timeline',
    'applications.saveStatusUpdate': 'Save status update',
    'applications.timelineEmpty': 'Timeline will appear here after loading the selected application.',
    'applications.candidateProfileAria': 'Candidate profile',
    'applications.candidateProfile': 'Candidate profile',
    'applications.closeCandidateProfile': 'Close candidate profile',

    'common.yes': 'Yes',
    'common.no': 'No',
    'common.updated': 'Updated',
    'common.id': 'ID',
    'common.company': 'Company',
    'common.untitledVacancy': 'Untitled vacancy',
    'common.candidate': 'Candidate',
    'common.system': 'System',
    'common.noPhone': 'No phone',
    'common.openingResume': 'Opening resume...',
    'common.opening': 'Opening...',
    'common.open': 'Open',
    'common.primary': 'Primary',
    'common.resume': 'Resume',
    'common.resumeLower': 'resume',
    'common.backToList': 'Back to list',
    'common.coverLetter': 'Cover letter',
    'common.chat': 'Chat',
    'common.timeline': 'Timeline',
    'common.reload': 'Reload',
    'common.contacts': 'Contacts',
    'common.career': 'Career',
    'common.desiredRole': 'Desired role',
    'common.experience': 'Experience',
    'common.education': 'Education',
    'common.desiredSalary': 'Desired salary',
    'common.availability': 'Availability',
    'common.preferences': 'Preferences',
    'common.openToWork': 'Open to work',
    'common.remoteReady': 'Remote ready',
    'common.relocationReady': 'Relocation ready',
    'common.skillsAndLevels': 'Skills and levels',
    'common.skillsNotSpecified': 'Skills are not specified.',
    'common.aboutCandidate': 'About candidate',
    'common.resumeFiles': 'Resume files',
    'common.noFileAttached': 'No file attached',
    'common.noCity': 'No city',
    'common.close': 'Close',

    'header.notifications': 'Notifications',
    'header.messages': 'Messages',
    'header.unread': 'Unread',
    'header.refreshNotifications': 'Refresh notifications',
    'header.markAllRead': 'Mark all as read',
    'header.loadingNotifications': 'Loading notifications...',
    'header.noNotifications': 'No notifications yet',
    'header.notification': 'Notification',
    'header.dragHint': 'Drag this window. Esc closes it.',
    'header.refreshChats': 'Refresh chats',
    'header.openFullPage': 'Open full page',
    'header.conversations': 'Conversations',
    'header.searchChats': 'Search by name, email, vacancy',
    'header.loadingChats': 'Loading chats...',
    'header.noDialogs': 'No dialogs found.',
    'header.unknownUser': 'Unknown user',
    'header.applicationChat': 'Application chat',
    'header.selectConversation': 'Select a conversation',
    'header.dialogsAppearHint': 'New dialogs appear automatically after applications and invites.',

    'landing.nav.features': 'Features',
    'landing.nav.howItWorks': 'How It Works',
    'landing.nav.benefits': 'Benefits',
    'landing.nav.testimonials': 'Testimonials',
    'landing.nav.signIn': 'Sign In',
    'landing.nav.getStarted': 'Get Started',

    'landing.hero.badge': 'Smart Career Matching Platform',
    'landing.hero.title': 'Your Perfect Career Match Starts Here',
    'landing.hero.subtitle':
      'Connect talented students and junior specialists with forward-thinking employers through virtual internships and intelligent job matching.',
    'landing.hero.applyNow': 'Apply Now',
    'landing.hero.findTalent': 'Find Talent',
    'landing.hero.stats.students': 'Students',
    'landing.hero.stats.companies': 'Companies',
    'landing.hero.stats.matchRate': 'Match Rate',
    'landing.hero.matchTitle': 'Perfect Match Found!',
    'landing.hero.matchDescription': 'Sarah matched with TechCorp for UX Design Internship',

    'landing.features.title': 'Everything You Need to Succeed',
    'landing.features.subtitle': 'Powerful features designed to connect talent with opportunity seamlessly',
    'landing.features.items.smartMatching.title': 'Smart Matching',
    'landing.features.items.smartMatching.description':
      'AI-powered algorithm that matches candidates with opportunities based on skills, interests, and company culture.',
    'landing.features.items.virtualInternships.title': 'Virtual Internships',
    'landing.features.items.virtualInternships.description':
      'Remote internship opportunities that let you gain real experience from anywhere in the world.',
    'landing.features.items.skillHiring.title': 'Skill-Based Hiring',
    'landing.features.items.skillHiring.description':
      'Focus on what you can do, not just your credentials. Showcase your skills through real projects.',
    'landing.features.items.talentPool.title': 'Diverse Talent Pool',
    'landing.features.items.talentPool.description':
      'Access to thousands of pre-vetted students and junior specialists across various fields.',
    'landing.features.items.quickOnboarding.title': 'Quick Onboarding',
    'landing.features.items.quickOnboarding.description':
      'Get started in minutes with our streamlined application and matching process.',
    'landing.features.items.verifiedCompanies.title': 'Verified Companies',
    'landing.features.items.verifiedCompanies.description':
      'All employers are verified to ensure safe and legitimate opportunities for candidates.',

    'landing.how.title': 'How It Works',
    'landing.how.subtitle': 'Three simple steps to find your perfect match',
    'landing.how.step1.title': 'Create Your Profile',
    'landing.how.step1.description':
      'Sign up and tell us about your skills, interests, and career goals. For employers, describe your ideal candidate.',
    'landing.how.step2.title': 'Get Matched',
    'landing.how.step2.description':
      'Our AI-powered algorithm analyzes your profile and finds the perfect matches based on compatibility and goals.',
    'landing.how.step3.title': 'Start Collaborating',
    'landing.how.step3.description':
      'Connect with your matches, start virtual internships, and build meaningful professional relationships.',

    'landing.benefits.title': 'Benefits for Everyone',
    'landing.benefits.subtitle':
      "Whether you're looking to start your career or find top talent, we've got you covered",
    'landing.benefits.candidates.badge': 'For Students & Junior Specialists',
    'landing.benefits.candidates.title': 'Launch Your Career with Confidence',
    'landing.benefits.candidates.item1': 'Gain real-world experience through virtual internships',
    'landing.benefits.candidates.item2': 'Access exclusive opportunities from verified companies',
    'landing.benefits.candidates.item3': 'Build your professional network from day one',
    'landing.benefits.candidates.item4': 'Develop in-demand skills with mentorship',
    'landing.benefits.candidates.item5': 'Get matched based on your unique strengths',
    'landing.benefits.employers.badge': 'For Employers',
    'landing.benefits.employers.title': 'Find Your Next Great Hire',
    'landing.benefits.employers.item1': 'Access pre-vetted, skilled junior talent',
    'landing.benefits.employers.item2': 'Reduce hiring time with smart matching',
    'landing.benefits.employers.item3': 'Try before you hire with virtual internships',
    'landing.benefits.employers.item4': 'Build a diverse and inclusive team',
    'landing.benefits.employers.item5': 'Scale your workforce flexibly',

    'landing.testimonials.title': 'Trusted by Thousands',
    'landing.testimonials.subtitle': 'See what our community has to say about their experience',
    'landing.testimonials.quote1':
      'This platform changed my career trajectory. I landed a virtual internship that turned into a full-time position within 3 months.',
    'landing.testimonials.role1': 'UX Design Intern at TechCorp',
    'landing.testimonials.quote2':
      "We've hired 5 amazing junior developers through this platform. The matching algorithm really understands what we need.",
    'landing.testimonials.role2': 'HR Director at InnovateLabs',
    'landing.testimonials.quote3':
      'As a student, I was nervous about finding the right opportunity. The virtual internship format was perfect for my schedule.',
    'landing.testimonials.role3': 'Marketing Intern at GrowthHub',
    'landing.testimonials.metrics.students': 'Active Students',
    'landing.testimonials.metrics.companies': 'Partner Companies',
    'landing.testimonials.metrics.matchRate': 'Match Success Rate',
    'landing.testimonials.metrics.placements': 'Placements This Year',
    'landing.testimonials.ctaTitle': 'Ready to Find Your Perfect Match?',
    'landing.testimonials.ctaSubtitle':
      'Join thousands of students and employers who have found success through our platform',
    'landing.testimonials.ctaPrimary': 'Get Started Now',
    'landing.testimonials.ctaSecondary': 'Schedule a Demo',

    'landing.contact.badge': 'Contact',
    'landing.contact.titlePrefix': 'Get in',
    'landing.contact.titleAccent': 'Touch',
    'landing.contact.subtitle':
      "Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
    'landing.contact.email': 'Email Us',
    'landing.contact.call': 'Call Us',
    'landing.contact.visit': 'Visit Us',

    'landing.contactForm.nameLabel': 'Your Name',
    'landing.contactForm.namePlaceholder': 'John Doe',
    'landing.contactForm.emailLabel': 'Email Address',
    'landing.contactForm.emailPlaceholder': 'john@example.com',
    'landing.contactForm.messageLabel': 'Message',
    'landing.contactForm.messagePlaceholder': 'How can we help you?',
    'landing.contactForm.success': "Message sent! We'll get back to you within 24 hours.",
    'landing.contactForm.submit': 'Send Message',
    'landing.contactForm.errors.nameRequired': 'Name is required',
    'landing.contactForm.errors.invalidEmail': 'Invalid email address',
    'landing.contactForm.errors.messageRequired': 'Message is required',

    'landing.footer.description':
      'Connecting talent with opportunity through smart matching and virtual internships.',
    'landing.footer.candidates.title': 'For Candidates',
    'landing.footer.candidates.link1': 'Find Internships',
    'landing.footer.candidates.link2': 'Browse Jobs',
    'landing.footer.candidates.link3': 'Career Resources',
    'landing.footer.candidates.link4': 'Success Stories',
    'landing.footer.employers.title': 'For Employers',
    'landing.footer.employers.link1': 'Post Opportunities',
    'landing.footer.employers.link2': 'Find Talent',
    'landing.footer.employers.link3': 'Pricing',
    'landing.footer.employers.link4': 'Case Studies',
    'landing.footer.company.title': 'Company',
    'landing.footer.company.link1': 'About Us',
    'landing.footer.company.link2': 'Contact',
    'landing.footer.company.link3': 'Privacy Policy',
    'landing.footer.company.link4': 'Terms of Service',
    'landing.footer.copyright': '© {year} BRaD. All rights reserved.',
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
    'applications.filter.dateFromShort': 'От',
    'applications.filter.dateToShort': 'До',
    'applications.error.loadList': 'Не удалось загрузить отклики',
    'applications.error.loadSingle': 'Не удалось загрузить отклик',
    'applications.error.withdraw': 'Не удалось отозвать отклик',
    'applications.error.updateStatus': 'Не удалось обновить статус отклика',
    'applications.error.openResume': 'Не удалось открыть резюме',
    'applications.viewCandidate': 'Открыть кандидата',
    'applications.openChat': 'Открыть чат',
    'applications.withdraw': 'Отозвать',
    'applications.fullView': 'Полный просмотр отклика',
    'applications.loadingDetails': 'Загрузка деталей отклика...',
    'applications.notFoundTitle': 'Отклик не найден',
    'applications.notFoundDescription': 'Этот отклик недоступен или больше не входит в вашу зону доступа.',
    'applications.openCandidateProfile': 'Открыть полный профиль кандидата',
    'applications.chatDescription': 'Откройте чат по отклику, чтобы продолжить общение в реальном времени.',
    'applications.updateStatus': 'Обновить статус',
    'applications.timelineNotePlaceholder': 'Необязательная заметка для таймлайна',
    'applications.saveStatusUpdate': 'Сохранить обновление статуса',
    'applications.timelineEmpty': 'Таймлайн появится здесь после загрузки выбранного отклика.',
    'applications.candidateProfileAria': 'Профиль кандидата',
    'applications.candidateProfile': 'Профиль кандидата',
    'applications.closeCandidateProfile': 'Закрыть профиль кандидата',

    'common.yes': 'Да',
    'common.no': 'Нет',
    'common.updated': 'Обновлено',
    'common.id': 'ID',
    'common.company': 'Компания',
    'common.untitledVacancy': 'Вакансия без названия',
    'common.candidate': 'Кандидат',
    'common.system': 'Система',
    'common.noPhone': 'Телефон не указан',
    'common.openingResume': 'Открываем резюме...',
    'common.opening': 'Открываем...',
    'common.open': 'Открыть',
    'common.primary': 'Основное',
    'common.resume': 'Резюме',
    'common.resumeLower': 'резюме',
    'common.backToList': 'Назад к списку',
    'common.coverLetter': 'Сопроводительное письмо',
    'common.chat': 'Чат',
    'common.timeline': 'Таймлайн',
    'common.reload': 'Обновить',
    'common.contacts': 'Контакты',
    'common.career': 'Карьера',
    'common.desiredRole': 'Желаемая роль',
    'common.experience': 'Опыт',
    'common.education': 'Образование',
    'common.desiredSalary': 'Желаемая зарплата',
    'common.availability': 'Доступность',
    'common.preferences': 'Предпочтения',
    'common.openToWork': 'Готов к работе',
    'common.remoteReady': 'Готов к удалёнке',
    'common.relocationReady': 'Готов к релокации',
    'common.skillsAndLevels': 'Навыки и уровни',
    'common.skillsNotSpecified': 'Навыки не указаны.',
    'common.aboutCandidate': 'О кандидате',
    'common.resumeFiles': 'Файлы резюме',
    'common.noFileAttached': 'Файл не прикреплён',
    'common.noCity': 'Город не указан',
    'common.close': 'Закрыть',

    'header.notifications': 'Уведомления',
    'header.messages': 'Сообщения',
    'header.unread': 'Непрочитано',
    'header.refreshNotifications': 'Обновить уведомления',
    'header.markAllRead': 'Отметить все прочитанными',
    'header.loadingNotifications': 'Загрузка уведомлений...',
    'header.noNotifications': 'Уведомлений пока нет',
    'header.notification': 'Уведомление',
    'header.dragHint': 'Перетаскивайте окно. Esc закрывает его.',
    'header.refreshChats': 'Обновить чаты',
    'header.openFullPage': 'Открыть полную страницу',
    'header.conversations': 'Диалоги',
    'header.searchChats': 'Поиск по имени, email, вакансии',
    'header.loadingChats': 'Загрузка чатов...',
    'header.noDialogs': 'Диалоги не найдены.',
    'header.unknownUser': 'Неизвестный пользователь',
    'header.applicationChat': 'Чат по отклику',
    'header.selectConversation': 'Выберите диалог',
    'header.dialogsAppearHint': 'Новые диалоги появляются автоматически после откликов и приглашений.',

    'landing.nav.features': 'Возможности',
    'landing.nav.howItWorks': 'Как это работает',
    'landing.nav.benefits': 'Преимущества',
    'landing.nav.testimonials': 'Отзывы',
    'landing.nav.signIn': 'Войти',
    'landing.nav.getStarted': 'Начать',

    'landing.hero.badge': 'Платформа умного карьерного мэтчинга',
    'landing.hero.title': 'Ваш идеальный карьерный матч начинается здесь',
    'landing.hero.subtitle':
      'Соединяем талантливых студентов и junior-специалистов с прогрессивными работодателями через виртуальные стажировки и умный подбор.',
    'landing.hero.applyNow': 'Откликнуться',
    'landing.hero.findTalent': 'Найти талант',
    'landing.hero.stats.students': 'Студенты',
    'landing.hero.stats.companies': 'Компании',
    'landing.hero.stats.matchRate': 'Точность мэтчинга',
    'landing.hero.matchTitle': 'Идеальный матч найден!',
    'landing.hero.matchDescription': 'Sarah получила матч с TechCorp на стажировку по UX-дизайну',

    'landing.features.title': 'Всё, что нужно для успеха',
    'landing.features.subtitle': 'Мощные возможности для бесшовного соединения талантов и возможностей',
    'landing.features.items.smartMatching.title': 'Умный мэтчинг',
    'landing.features.items.smartMatching.description':
      'Алгоритм на базе ИИ подбирает кандидатов и возможности по навыкам, интересам и культуре компании.',
    'landing.features.items.virtualInternships.title': 'Виртуальные стажировки',
    'landing.features.items.virtualInternships.description':
      'Удалённые стажировки, которые позволяют получать реальный опыт из любой точки мира.',
    'landing.features.items.skillHiring.title': 'Найм по навыкам',
    'landing.features.items.skillHiring.description':
      'Фокус на том, что вы умеете, а не только на формальных регалиях. Показывайте навыки через реальные проекты.',
    'landing.features.items.talentPool.title': 'Широкий пул талантов',
    'landing.features.items.talentPool.description':
      'Доступ к тысячам предварительно проверенных студентов и junior-специалистов в разных сферах.',
    'landing.features.items.quickOnboarding.title': 'Быстрый старт',
    'landing.features.items.quickOnboarding.description':
      'Начните за минуты благодаря упрощённому процессу заявки и подбора.',
    'landing.features.items.verifiedCompanies.title': 'Проверенные компании',
    'landing.features.items.verifiedCompanies.description':
      'Все работодатели верифицированы для безопасных и легитимных возможностей для кандидатов.',

    'landing.how.title': 'Как это работает',
    'landing.how.subtitle': 'Три простых шага к вашему идеальному матчу',
    'landing.how.step1.title': 'Создайте профиль',
    'landing.how.step1.description':
      'Зарегистрируйтесь и расскажите о навыках, интересах и карьерных целях. Работодатели описывают идеального кандидата.',
    'landing.how.step2.title': 'Получите подбор',
    'landing.how.step2.description':
      'Наш ИИ анализирует профиль и находит лучшие совпадения по совместимости и целям.',
    'landing.how.step3.title': 'Начните сотрудничать',
    'landing.how.step3.description':
      'Связывайтесь с мэтчами, запускайте виртуальные стажировки и выстраивайте профессиональные отношения.',

    'landing.benefits.title': 'Преимущества для всех',
    'landing.benefits.subtitle':
      'Ищете старт карьеры или сильных сотрудников — у нас есть решение для обеих сторон',
    'landing.benefits.candidates.badge': 'Для студентов и junior-специалистов',
    'landing.benefits.candidates.title': 'Запускайте карьеру уверенно',
    'landing.benefits.candidates.item1': 'Получайте реальный опыт через виртуальные стажировки',
    'landing.benefits.candidates.item2': 'Доступ к эксклюзивным вакансиям от проверенных компаний',
    'landing.benefits.candidates.item3': 'Стройте профессиональный нетворк с первого дня',
    'landing.benefits.candidates.item4': 'Развивайте востребованные навыки с менторством',
    'landing.benefits.candidates.item5': 'Получайте подбор под ваши сильные стороны',
    'landing.benefits.employers.badge': 'Для работодателей',
    'landing.benefits.employers.title': 'Найдите своего следующего сильного сотрудника',
    'landing.benefits.employers.item1': 'Доступ к проверенным junior-кандидатам',
    'landing.benefits.employers.item2': 'Сокращайте время найма с умным подбором',
    'landing.benefits.employers.item3': 'Пробуйте формат стажировки до оффера',
    'landing.benefits.employers.item4': 'Собирайте разнообразные и инклюзивные команды',
    'landing.benefits.employers.item5': 'Гибко масштабируйте команду',

    'landing.testimonials.title': 'Нам доверяют тысячи',
    'landing.testimonials.subtitle': 'Посмотрите, что говорит сообщество о своём опыте',
    'landing.testimonials.quote1':
      'Эта платформа изменила мою карьерную траекторию. Я получила виртуальную стажировку, которая через 3 месяца превратилась в full-time.',
    'landing.testimonials.role1': 'Стажёр UX-дизайна в TechCorp',
    'landing.testimonials.quote2':
      'Через эту платформу мы наняли 5 отличных junior-разработчиков. Алгоритм подбора действительно понимает, кто нам нужен.',
    'landing.testimonials.role2': 'HR-директор в InnovateLabs',
    'landing.testimonials.quote3':
      'Как студент, я переживала, что не найду подходящую возможность. Формат виртуальной стажировки идеально подошёл под мой график.',
    'landing.testimonials.role3': 'Стажёр по маркетингу в GrowthHub',
    'landing.testimonials.metrics.students': 'Активных студентов',
    'landing.testimonials.metrics.companies': 'Партнёрских компаний',
    'landing.testimonials.metrics.matchRate': 'Успешность мэтчинга',
    'landing.testimonials.metrics.placements': 'Трудоустройств за год',
    'landing.testimonials.ctaTitle': 'Готовы найти свой идеальный матч?',
    'landing.testimonials.ctaSubtitle':
      'Присоединяйтесь к тысячам студентов и работодателей, которые уже нашли успех с нашей платформой',
    'landing.testimonials.ctaPrimary': 'Начать сейчас',
    'landing.testimonials.ctaSecondary': 'Запланировать демо',

    'landing.contact.badge': 'Контакты',
    'landing.contact.titlePrefix': 'Свяжитесь',
    'landing.contact.titleAccent': 'с нами',
    'landing.contact.subtitle':
      'Есть вопросы? Мы будем рады помочь. Напишите нам, и мы ответим как можно скорее.',
    'landing.contact.email': 'Напишите нам',
    'landing.contact.call': 'Позвоните нам',
    'landing.contact.visit': 'Наш адрес',

    'landing.contactForm.nameLabel': 'Ваше имя',
    'landing.contactForm.namePlaceholder': 'Иван Иванов',
    'landing.contactForm.emailLabel': 'Email адрес',
    'landing.contactForm.emailPlaceholder': 'ivan@example.com',
    'landing.contactForm.messageLabel': 'Сообщение',
    'landing.contactForm.messagePlaceholder': 'Чем можем помочь?',
    'landing.contactForm.success': 'Сообщение отправлено! Мы ответим в течение 24 часов.',
    'landing.contactForm.submit': 'Отправить сообщение',
    'landing.contactForm.errors.nameRequired': 'Имя обязательно',
    'landing.contactForm.errors.invalidEmail': 'Некорректный email',
    'landing.contactForm.errors.messageRequired': 'Сообщение обязательно',

    'landing.footer.description':
      'Соединяем таланты с возможностями через умный подбор и виртуальные стажировки.',
    'landing.footer.candidates.title': 'Для кандидатов',
    'landing.footer.candidates.link1': 'Найти стажировки',
    'landing.footer.candidates.link2': 'Смотреть вакансии',
    'landing.footer.candidates.link3': 'Карьерные ресурсы',
    'landing.footer.candidates.link4': 'Истории успеха',
    'landing.footer.employers.title': 'Для работодателей',
    'landing.footer.employers.link1': 'Опубликовать вакансию',
    'landing.footer.employers.link2': 'Найти талант',
    'landing.footer.employers.link3': 'Тарифы',
    'landing.footer.employers.link4': 'Кейсы',
    'landing.footer.company.title': 'Компания',
    'landing.footer.company.link1': 'О нас',
    'landing.footer.company.link2': 'Контакты',
    'landing.footer.company.link3': 'Политика конфиденциальности',
    'landing.footer.company.link4': 'Условия использования',
    'landing.footer.copyright': '© {year} BRaD. Все права защищены.',
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
    'applications.filter.dateFromShort': 'Баст.',
    'applications.filter.dateToShort': 'Аяқт.',
    'applications.error.loadList': 'Өтінімдерді жүктеу сәтсіз аяқталды',
    'applications.error.loadSingle': 'Өтінімді жүктеу сәтсіз аяқталды',
    'applications.error.withdraw': 'Өтінімді қайтарып алу сәтсіз аяқталды',
    'applications.error.updateStatus': 'Өтінім мәртебесін жаңарту сәтсіз аяқталды',
    'applications.error.openResume': 'Түйіндемені ашу сәтсіз аяқталды',
    'applications.viewCandidate': 'Кандидатты ашу',
    'applications.openChat': 'Чатты ашу',
    'applications.withdraw': 'Қайтарып алу',
    'applications.fullView': 'Өтінімнің толық көрінісі',
    'applications.loadingDetails': 'Өтінім мәліметтері жүктелуде...',
    'applications.notFoundTitle': 'Өтінім табылмады',
    'applications.notFoundDescription': 'Бұл өтінім қолжетімсіз немесе сіздің қолжетімділік аймағыңыздан тыс.',
    'applications.openCandidateProfile': 'Кандидаттың толық профилін ашу',
    'applications.chatDescription': 'Нақты уақыт режимінде сөйлесуді жалғастыру үшін өтінім чатын ашыңыз.',
    'applications.updateStatus': 'Мәртебені жаңарту',
    'applications.timelineNotePlaceholder': 'Таймлайн үшін қосымша ескерту',
    'applications.saveStatusUpdate': 'Мәртебе жаңартуын сақтау',
    'applications.timelineEmpty': 'Таңдалған өтінім жүктелгеннен кейін таймлайн осында көрінеді.',
    'applications.candidateProfileAria': 'Кандидат профилі',
    'applications.candidateProfile': 'Кандидат профилі',
    'applications.closeCandidateProfile': 'Кандидат профилін жабу',

    'common.yes': 'Иә',
    'common.no': 'Жоқ',
    'common.updated': 'Жаңартылды',
    'common.id': 'ID',
    'common.company': 'Компания',
    'common.untitledVacancy': 'Атаусыз вакансия',
    'common.candidate': 'Кандидат',
    'common.system': 'Жүйе',
    'common.noPhone': 'Телефон көрсетілмеген',
    'common.openingResume': 'Түйіндеме ашылуда...',
    'common.opening': 'Ашылуда...',
    'common.open': 'Ашу',
    'common.primary': 'Негізгі',
    'common.resume': 'Түйіндеме',
    'common.resumeLower': 'түйіндеме',
    'common.backToList': 'Тізімге оралу',
    'common.coverLetter': 'Ілеспе хат',
    'common.chat': 'Чат',
    'common.timeline': 'Таймлайн',
    'common.reload': 'Қайта жүктеу',
    'common.contacts': 'Байланыс',
    'common.career': 'Карьера',
    'common.desiredRole': 'Қалаған рөл',
    'common.experience': 'Тәжірибе',
    'common.education': 'Білім',
    'common.desiredSalary': 'Қалаған жалақы',
    'common.availability': 'Қолжетімділік',
    'common.preferences': 'Қалаулар',
    'common.openToWork': 'Жұмысқа ашық',
    'common.remoteReady': 'Қашықтан жұмысқа дайын',
    'common.relocationReady': 'Көшуге дайын',
    'common.skillsAndLevels': 'Дағдылар мен деңгейлер',
    'common.skillsNotSpecified': 'Дағдылар көрсетілмеген.',
    'common.aboutCandidate': 'Кандидат туралы',
    'common.resumeFiles': 'Түйіндеме файлдары',
    'common.noFileAttached': 'Файл тіркелмеген',
    'common.noCity': 'Қала көрсетілмеген',
    'common.close': 'Жабу',

    'header.notifications': 'Хабарламалар',
    'header.messages': 'Хабарламалар',
    'header.unread': 'Оқылмағаны',
    'header.refreshNotifications': 'Хабарламаларды жаңарту',
    'header.markAllRead': 'Барлығын оқылған деп белгілеу',
    'header.loadingNotifications': 'Хабарламалар жүктелуде...',
    'header.noNotifications': 'Әзірге хабарлама жоқ',
    'header.notification': 'Хабарлама',
    'header.dragHint': 'Терезені сүйреп апарыңыз. Esc жабады.',
    'header.refreshChats': 'Чаттарды жаңарту',
    'header.openFullPage': 'Толық бетті ашу',
    'header.conversations': 'Диалогтар',
    'header.searchChats': 'Аты, email, вакансия бойынша іздеу',
    'header.loadingChats': 'Чаттар жүктелуде...',
    'header.noDialogs': 'Диалог табылмады.',
    'header.unknownUser': 'Белгісіз пайдаланушы',
    'header.applicationChat': 'Өтінім чаты',
    'header.selectConversation': 'Диалог таңдаңыз',
    'header.dialogsAppearHint': 'Жаңа диалогтар өтінімдер мен шақырулардан кейін автоматты пайда болады.',

    'landing.nav.features': 'Мүмкіндіктер',
    'landing.nav.howItWorks': 'Қалай жұмыс істейді',
    'landing.nav.benefits': 'Артықшылықтар',
    'landing.nav.testimonials': 'Пікірлер',
    'landing.nav.signIn': 'Кіру',
    'landing.nav.getStarted': 'Бастау',

    'landing.hero.badge': 'Ақылды мансаптық сәйкестендіру платформасы',
    'landing.hero.title': 'Сіздің мінсіз мансаптық сәйкестігіңіз осы жерден басталады',
    'landing.hero.subtitle':
      'Талантты студенттер мен junior мамандарды виртуалды тәжірибелер және ақылды іріктеу арқылы озық жұмыс берушілермен байланыстырамыз.',
    'landing.hero.applyNow': 'Өтінім беру',
    'landing.hero.findTalent': 'Талант табу',
    'landing.hero.stats.students': 'Студенттер',
    'landing.hero.stats.companies': 'Компаниялар',
    'landing.hero.stats.matchRate': 'Сәйкестік деңгейі',
    'landing.hero.matchTitle': 'Керемет сәйкестік табылды!',
    'landing.hero.matchDescription': 'Sarah TechCorp-та UX Design Internship бағдарламасына сәйкес келді',

    'landing.features.title': 'Жетістікке жету үшін қажеттінің бәрі',
    'landing.features.subtitle': 'Талант пен мүмкіндікті тиімді байланыстыратын қуатты мүмкіндіктер',
    'landing.features.items.smartMatching.title': 'Ақылды сәйкестендіру',
    'landing.features.items.smartMatching.description':
      'ИИ алгоритмі кандидаттар мен мүмкіндіктерді дағдылар, қызығушылықтар және компания мәдениеті бойынша сәйкестендіреді.',
    'landing.features.items.virtualInternships.title': 'Виртуалды тәжірибелер',
    'landing.features.items.virtualInternships.description':
      'Әлемнің кез келген жерінен нақты тәжірибе алуға мүмкіндік беретін қашықтан тәжірибелер.',
    'landing.features.items.skillHiring.title': 'Дағдыға негізделген жалдау',
    'landing.features.items.skillHiring.description':
      'Тек диплом емес, нақты не істей алатыныңыз маңызды. Дағдыларыңызды нақты жобалармен көрсетіңіз.',
    'landing.features.items.talentPool.title': 'Кең таланттар базасы',
    'landing.features.items.talentPool.description':
      'Әртүрлі салалардағы алдын ала тексерілген мыңдаған студент пен junior мамандарға қолжетімділік.',
    'landing.features.items.quickOnboarding.title': 'Жылдам бастау',
    'landing.features.items.quickOnboarding.description':
      'Қарапайым өтінім және іріктеу процесі арқылы минуттар ішінде жұмысты бастаңыз.',
    'landing.features.items.verifiedCompanies.title': 'Тексерілген компаниялар',
    'landing.features.items.verifiedCompanies.description':
      'Кандидаттар үшін қауіпсіз және сенімді мүмкіндіктер болу үшін барлық жұмыс берушілер тексеріледі.',

    'landing.how.title': 'Қалай жұмыс істейді',
    'landing.how.subtitle': 'Мінсіз сәйкестікті табудың үш қарапайым қадамы',
    'landing.how.step1.title': 'Профиль жасаңыз',
    'landing.how.step1.description':
      'Тіркеліп, дағдыларыңыз, қызығушылықтарыңыз және мансаптық мақсаттарыңыз туралы айтыңыз. Жұмыс берушілер де идеал кандидат профилін сипаттайды.',
    'landing.how.step2.title': 'Сәйкестік алыңыз',
    'landing.how.step2.description':
      'Біздің ИИ сіздің профиліңізді талдап, үйлесімділік пен мақсаттарға сай ең жақсы сәйкестіктерді табады.',
    'landing.how.step3.title': 'Ынтымақтастықты бастаңыз',
    'landing.how.step3.description':
      'Сәйкес келетін адамдармен байланысып, виртуалды тәжірибені бастап, мағыналы кәсіби қатынас орнатыңыз.',

    'landing.benefits.title': 'Барлығына арналған артықшылықтар',
    'landing.benefits.subtitle':
      'Мансапты бастайсыз ба, әлде мықты маман іздейсіз бе — екі жаққа да тиімді шешім бар',
    'landing.benefits.candidates.badge': 'Студенттер мен junior мамандар үшін',
    'landing.benefits.candidates.title': 'Карьераңызды сенімді бастаңыз',
    'landing.benefits.candidates.item1': 'Виртуалды тәжірибе арқылы нақты жұмыс тәжірибесін алыңыз',
    'landing.benefits.candidates.item2': 'Тексерілген компаниялардан эксклюзив мүмкіндіктерге қол жеткізіңіз',
    'landing.benefits.candidates.item3': 'Алғашқы күннен кәсіби желіңізді кеңейтіңіз',
    'landing.benefits.candidates.item4': 'Менторлықпен сұранысқа ие дағдыларды дамытыңыз',
    'landing.benefits.candidates.item5': 'Күшті жақтарыңызға сай сәйкестік алыңыз',
    'landing.benefits.employers.badge': 'Жұмыс берушілер үшін',
    'landing.benefits.employers.title': 'Келесі мықты маманды табыңыз',
    'landing.benefits.employers.item1': 'Алдын ала тексерілген junior таланттарға қолжетімділік',
    'landing.benefits.employers.item2': 'Ақылды іріктеу арқылы жалдау уақытын қысқартыңыз',
    'landing.benefits.employers.item3': 'Ұсынар алдында виртуалды тәжірибе форматында байқап көріңіз',
    'landing.benefits.employers.item4': 'Әртүрлі және инклюзив команда құрыңыз',
    'landing.benefits.employers.item5': 'Командаңызды икемді түрде масштабтаңыз',

    'landing.testimonials.title': 'Мыңдаған адам сенеді',
    'landing.testimonials.subtitle': 'Қауымдастық өз тәжірибесі туралы не айтатынын көріңіз',
    'landing.testimonials.quote1':
      'Бұл платформа менің мансап бағытымды өзгертті. 3 ай ішінде виртуалды тәжірибе толық штаттағы жұмысқа айналды.',
    'landing.testimonials.role1': 'TechCorp компаниясындағы UX Design Intern',
    'landing.testimonials.quote2':
      'Осы платформа арқылы 5 керемет junior әзірлеуші жалдадық. Іріктеу алгоритмі бізге керегін жақсы түсінеді.',
    'landing.testimonials.role2': 'InnovateLabs компаниясындағы HR Director',
    'landing.testimonials.quote3':
      'Студент ретінде дұрыс мүмкіндікті табу қиын болды. Виртуалды тәжірибе форматы кестеме дәл келді.',
    'landing.testimonials.role3': 'GrowthHub компаниясындағы Marketing Intern',
    'landing.testimonials.metrics.students': 'Белсенді студенттер',
    'landing.testimonials.metrics.companies': 'Серіктес компаниялар',
    'landing.testimonials.metrics.matchRate': 'Сәтті сәйкестік үлесі',
    'landing.testimonials.metrics.placements': 'Осы жылдағы орналастыру',
    'landing.testimonials.ctaTitle': 'Өзіңізге мінсіз сәйкестік табуға дайынсыз ба?',
    'landing.testimonials.ctaSubtitle':
      'Біздің платформа арқылы табыс тапқан мыңдаған студент пен жұмыс берушіге қосылыңыз',
    'landing.testimonials.ctaPrimary': 'Қазір бастау',
    'landing.testimonials.ctaSecondary': 'Демоға жазылу',

    'landing.contact.badge': 'Байланыс',
    'landing.contact.titlePrefix': 'Бізбен',
    'landing.contact.titleAccent': 'хабарласыңыз',
    'landing.contact.subtitle':
      'Сұрақтарыңыз бар ма? Біз сізді тыңдауға дайынбыз. Хабарлама жіберіңіз, мүмкіндігінше тез жауап береміз.',
    'landing.contact.email': 'Email арқылы',
    'landing.contact.call': 'Қоңырау шалу',
    'landing.contact.visit': 'Келу',

    'landing.contactForm.nameLabel': 'Атыңыз',
    'landing.contactForm.namePlaceholder': 'Айдос Әлиев',
    'landing.contactForm.emailLabel': 'Email мекенжайы',
    'landing.contactForm.emailPlaceholder': 'aidos@example.com',
    'landing.contactForm.messageLabel': 'Хабарлама',
    'landing.contactForm.messagePlaceholder': 'Қалай көмектесе аламыз?',
    'landing.contactForm.success': 'Хабарлама жіберілді! Біз 24 сағат ішінде жауап береміз.',
    'landing.contactForm.submit': 'Хабарлама жіберу',
    'landing.contactForm.errors.nameRequired': 'Аты-жөні міндетті',
    'landing.contactForm.errors.invalidEmail': 'Email қате енгізілген',
    'landing.contactForm.errors.messageRequired': 'Хабарлама міндетті',

    'landing.footer.description':
      'Талантты мүмкіндіктермен ақылды сәйкестендіру және виртуалды тәжірибе арқылы байланыстырамыз.',
    'landing.footer.candidates.title': 'Кандидаттарға',
    'landing.footer.candidates.link1': 'Тәжірибелерді табу',
    'landing.footer.candidates.link2': 'Вакансияларды қарау',
    'landing.footer.candidates.link3': 'Карьера ресурстары',
    'landing.footer.candidates.link4': 'Табыс оқиғалары',
    'landing.footer.employers.title': 'Жұмыс берушілерге',
    'landing.footer.employers.link1': 'Мүмкіндікті жариялау',
    'landing.footer.employers.link2': 'Талант табу',
    'landing.footer.employers.link3': 'Тарифтер',
    'landing.footer.employers.link4': 'Кейстер',
    'landing.footer.company.title': 'Компания',
    'landing.footer.company.link1': 'Біз туралы',
    'landing.footer.company.link2': 'Байланыс',
    'landing.footer.company.link3': 'Құпиялық саясаты',
    'landing.footer.company.link4': 'Қызмет көрсету шарттары',
    'landing.footer.copyright': '© {year} BRaD. Барлық құқықтар қорғалған.',
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
