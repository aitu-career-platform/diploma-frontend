import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, MessageSquare, Menu, X } from 'lucide-react';
import { isEmployerRole, useUserStore } from '@entities/user';
import { useState } from 'react';
import '../../../pages/landing/ui/landing.css';

export const AppHeader = () => {
  const { currentUser, isAuthenticated, logout } = useUserStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/app');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/app" className="navbar-logo">
          <img src="/images/logo/logo.png" alt="BRaD Logo" className="logo-img" />
        </Link>
        
        <div className="navbar-menu">
          <Link to="/app/jobs" className="nav-link">
            Jobs
          </Link>
          {isAuthenticated && (
            <>
              <Link to="/app/profile" className="nav-link">
                Profile
              </Link>
              {isEmployerRole(currentUser?.role) && (
                <Link to="/app/employer" className="nav-link">
                  Employer Dashboard
                </Link>
              )}
            </>
          )}
        </div>
        
        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              <Link to="/app/chat" className="nav-btn nav-btn-ghost hidden sm:inline-block">
                <MessageSquare className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-2">
                <Link 
                  to="/app/profile" 
                  className="hidden sm:block w-8 h-8 flex-shrink-0"
                  style={{ lineHeight: 0 }}
                >
                  {currentUser?.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="nav-btn nav-btn-ghost hidden sm:inline-flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden nav-btn nav-btn-ghost"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <>
              <Link to="/app/login" className="nav-btn nav-btn-ghost hidden sm:inline-block">
                Sign In
              </Link>
              <Link to="/app/register" className="nav-btn nav-btn-primary">
                Get Started
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden nav-btn nav-btn-ghost"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden mt-4 p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
          <nav className="flex flex-col gap-4">
            <Link
              to="/app/jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="nav-link"
            >
              Jobs
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  to="/app/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="nav-link"
                >
                  Profile
                </Link>
                <Link
                  to="/app/chat"
                  onClick={() => setMobileMenuOpen(false)}
                  className="nav-link"
                >
                  Messages
                </Link>
                {isEmployerRole(currentUser?.role) && (
                  <Link
                    to="/app/employer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="nav-link"
                  >
                    Employer Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="nav-btn nav-btn-ghost text-left"
                >
                  <LogOut className="w-4 h-4 inline mr-2" />
                  Logout
                </button>
              </>
            )}
            {!isAuthenticated && (
              <>
                <Link
                  to="/app/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="nav-link"
                >
                  Sign In
                </Link>
                <Link
                  to="/app/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="nav-btn nav-btn-primary"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </nav>
  );
};
