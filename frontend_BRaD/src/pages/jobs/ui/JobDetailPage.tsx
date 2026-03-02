import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, DollarSign, MessageSquare } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button } from '@shared/ui';
import { useJobStore } from '@entities/job';
import { isCandidateRole, useUserStore } from '@entities/user';
import { useEffect, useState } from 'react';
import { ChatWindow } from '@features/chat';
import { useMessageStore } from '@entities/message';

export const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { jobs, isLoading, loadJobs } = useJobStore();
  const { currentUser, isAuthenticated } = useUserStore();
  const { getOrCreateConversation } = useMessageStore();
  const [showChat, setShowChat] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (jobs.length === 0) {
      void loadJobs();
    }
  }, [jobs.length, loadJobs]);

  const job = jobs.find((j) => j.id === id);

  if (!job && isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#EBEDDF', paddingTop: '4rem' }}>
        <AppHeader />
        <main className="container mx-auto px-6 py-12" style={{ maxWidth: '1280px' }}>
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold mb-4" style={{ color: '#333A2F' }}>Loading job...</h1>
          </div>
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#EBEDDF', paddingTop: '4rem' }}>
        <AppHeader />
        <main className="container mx-auto px-6 py-12" style={{ maxWidth: '1280px' }}>
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold mb-4" style={{ color: '#333A2F' }}>Job not found</h1>
            <Link to="/app/jobs">
              <Button style={{ backgroundColor: '#333A2F', color: 'white' }}>Back to Jobs</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen" style={{ backgroundColor: '#EBEDDF', paddingTop: '4rem' }}>
        <AppHeader />
        <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8" style={{ maxWidth: '1280px' }}>
          <Link
            to="/app/jobs"
            className="inline-flex items-center gap-2 mb-6 transition-colors"
            style={{ color: 'rgba(51, 58, 47, 0.7)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Jobs</span>
          </Link>

          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6">
                  <img
                    src={job.companyLogo || '/images/companies/default_company.jpg'}
                    alt={job.company}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#333A2F' }}>{job.title}</h1>
                    <p className="text-lg sm:text-xl mb-4" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>{job.company}</p>
                    <div className="flex flex-wrap gap-3 sm:gap-4 text-sm sm:text-base" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{job.type}</span>
                      </div>
                      {job.salary && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span>{job.salary}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: '#EBEDDF', color: '#333A2F' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="font-heading text-xl font-bold mb-3" style={{ color: '#333A2F' }}>Description</h2>
                    <p className="leading-relaxed" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>{job.description}</p>
                  </div>

                  <div>
                    <h2 className="font-heading text-xl font-bold mb-3" style={{ color: '#333A2F' }}>Requirements</h2>
                    <ul className="space-y-2">
                      {job.requirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                          <span className="mt-1" style={{ color: '#333A2F' }}>•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-24" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                <div className="space-y-4">
                  <div className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                    <p>Posted {new Date(job.postedAt).toLocaleDateString()}</p>
                    <p>{job.applicationsCount} applications</p>
                  </div>

                  {isAuthenticated && isCandidateRole(currentUser?.role) ? (
                    <>
                      <Button 
                        variant="hero" 
                        size="lg" 
                        className="w-full"
                        style={{ backgroundColor: '#333A2F', color: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      >
                        Apply Now
                      </Button>
                      <button
                        className="w-full px-8 py-3 rounded-xl text-base font-semibold border-2 transition-all duration-200 flex items-center justify-center gap-2"
                        onClick={() => {
                          if (currentUser) {
                            const convId = getOrCreateConversation(currentUser.id, job.employerId);
                            setConversationId(convId);
                            setShowChat(true);
                          }
                        }}
                        style={{ 
                          borderColor: 'rgba(51, 58, 47, 0.2)',
                          color: '#333A2F',
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#333A2F';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = '#333A2F';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#333A2F';
                          e.currentTarget.style.borderColor = 'rgba(51, 58, 47, 0.2)';
                        }}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Contact Employer
                      </button>
                    </>
                  ) : (
                    <Button 
                      variant="hero" 
                      size="lg" 
                      className="w-full" 
                      disabled
                      style={{ backgroundColor: '#333A2F', color: 'white', opacity: 0.5 }}
                    >
                      Sign in to Apply
                    </Button>
                  )}

                  <div className="pt-4 border-t" style={{ borderColor: 'rgba(51, 58, 47, 0.1)' }}>
                    <h3 className="font-semibold mb-2" style={{ color: '#333A2F' }}>About {job.company}</h3>
                    <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      We are a leading company in the tech industry, focused on innovation and
                      excellence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showChat && conversationId && (
        <ChatWindow
          conversationId={conversationId}
          receiverId={job.employerId}
          receiverName={job.company}
          onClose={() => {
            setShowChat(false);
            setConversationId(null);
          }}
        />
      )}
    </>
  );
};
