import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from '@pages/landing';
import { AppPage } from '@pages/app';
import { JobsPage, JobDetailPage } from '@pages/jobs';
import { ProfilePage } from '@pages/profile';
import { EmployerPage } from '@pages/employer';
import { ChatPage } from '@pages/chat';
import { ApplicationsPage } from '@pages/applications';
import { AdminPanelPage } from '@pages/admin';
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
        <Route path="/app/applications" element={<ApplicationsPage />} />
        <Route path="/app/applications/:applicationId" element={<ApplicationsPage />} />
        <Route path="/app/profile" element={<ProfilePage />} />
        <Route path="/app/employer" element={<EmployerPage />} />
        <Route path="/app/admin" element={<AdminPanelPage />} />
        <Route path="/app/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  );
};
