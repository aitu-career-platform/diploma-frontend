import { Link } from 'react-router-dom';
import { AppHeader } from '@widgets/app-header';
import { Button } from '@shared/ui';
import { ArrowRight, ClipboardList, Search, Users } from 'lucide-react';

export const AppPage = () => {
  return (
    <div className="min-h-screen app-page" style={{ backgroundColor: '#EBEDDF', color: '#333A2F' }}>
      <AppHeader />
      <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16" style={{ maxWidth: '1280px' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold mb-6" style={{ color: '#333A2F' }}>
            Welcome to <span style={{ color: '#333A2F' }}>BRaD.</span>
          </h1>
          <p className="text-xl mb-12 max-w-2xl mx-auto" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
            Your gateway to remote opportunities. Find your dream job or discover talented candidates.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Link to="/app/jobs">
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all group" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors" style={{ backgroundColor: '#EBEDDF' }}>
                  <Search className="w-8 h-8" style={{ color: '#333A2F' }} />
                </div>
                <h3 className="font-heading text-xl font-bold mb-2" style={{ color: '#333A2F' }}>Browse Jobs</h3>
                <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                  Explore thousands of remote opportunities
                </p>
              </div>
            </Link>

            <Link to="/app/applications">
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all group" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors" style={{ backgroundColor: '#EBEDDF' }}>
                  <ClipboardList className="w-8 h-8" style={{ color: '#333A2F' }} />
                </div>
                <h3 className="font-heading text-xl font-bold mb-2" style={{ color: '#333A2F' }}>Applications</h3>
                <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                  Track statuses, timelines, and hiring flow
                </p>
              </div>
            </Link>

            <Link to="/app/profile">
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all group" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors" style={{ backgroundColor: '#EBEDDF' }}>
                  <Users className="w-8 h-8" style={{ color: '#333A2F' }} />
                </div>
                <h3 className="font-heading text-xl font-bold mb-2" style={{ color: '#333A2F' }}>Your Profile</h3>
                <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                  Keep your candidate or employer profile up to date
                </p>
              </div>
            </Link>
          </div>

          <Link to="/app/jobs">
            <Button 
              variant="hero" 
              size="xl"
              className="inline-flex items-center gap-2"
              style={{ 
                backgroundColor: '#333A2F', 
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
            >
              Start Exploring
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};
