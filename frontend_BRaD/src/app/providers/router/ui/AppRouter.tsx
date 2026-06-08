import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from '@pages/landing';
import { AppPage } from '@pages/app';
import { JobsPage, JobDetailPage } from '@pages/jobs';
import { ProfilePage } from '@pages/profile';
import { EmployerPage } from '@pages/employer';
import {
  MiniInternshipsCatalogPage,
  MiniInternshipDetailPage,
  MiniInternshipSubmitPage,
  MyMiniInternshipSubmissionDetailPage,
  MyMiniInternshipSubmissionsPage,
} from '@pages/mini-internships';
import {
  EmployerMiniInternshipEditorPage,
  EmployerMiniInternshipReviewPage,
  EmployerMiniInternshipSubmissionsPage,
  EmployerMiniInternshipsPage,
} from '@pages/employer-mini-internships';
import { ChatPage } from '@pages/chat';
import { ApplicationsPage } from '@pages/applications';
import { AdminPanelPage } from '@pages/admin';
import { UniversityPage } from '@pages/university';
import { StatisticsPage } from '@pages/statistics';
import { LoginPage, RegisterPage, VerifyEmailPage, RequestPasswordResetPage, ResetPasswordPage } from '@pages/auth';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/app/login" element={<LoginPage />} />
        <Route path="/app/register" element={<RegisterPage />} />
        <Route path="/app/verify-email" element={<VerifyEmailPage />} />
        <Route path="/app/forgot-password" element={<RequestPasswordResetPage />} />
        <Route path="/app/reset-password" element={<ResetPasswordPage />} />
        <Route path="/app/jobs" element={<JobsPage />} />
        <Route path="/app/jobs/:id" element={<JobDetailPage />} />
        <Route path="/app/mini-internships" element={<MiniInternshipsCatalogPage />} />
        <Route path="/app/mini-internships/:id" element={<MiniInternshipDetailPage />} />
        <Route path="/app/mini-internships/:id/submit" element={<MiniInternshipSubmitPage />} />
        <Route path="/app/my-submissions" element={<MyMiniInternshipSubmissionsPage />} />
        <Route path="/app/my-submissions/:id" element={<MyMiniInternshipSubmissionDetailPage />} />
        <Route path="/app/applications" element={<ApplicationsPage />} />
        <Route path="/app/applications/:applicationId" element={<ApplicationsPage />} />
        <Route path="/app/profile" element={<ProfilePage />} />
        <Route path="/app/employer" element={<EmployerPage />} />
        <Route path="/app/employer/mini-internships" element={<EmployerMiniInternshipsPage />} />
        <Route path="/app/employer/mini-internships/create" element={<EmployerMiniInternshipEditorPage />} />
        <Route path="/app/employer/mini-internships/:id/edit" element={<EmployerMiniInternshipEditorPage />} />
        <Route path="/app/employer/mini-internships/:id/submissions" element={<EmployerMiniInternshipSubmissionsPage />} />
        <Route path="/app/employer/submissions/:id/review" element={<EmployerMiniInternshipReviewPage />} />
        <Route path="/app/admin" element={<AdminPanelPage />} />
        <Route path="/app/university" element={<UniversityPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/app/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  );
};
