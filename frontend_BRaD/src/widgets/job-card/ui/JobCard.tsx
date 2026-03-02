import { MapPin, Clock, DollarSign, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Job } from '@entities/job';
import { isCandidateRole, useUserStore } from '@entities/user';
import { useState } from 'react';
import { ChatWindow } from '@features/chat';
import { useMessageStore } from '@entities/message';

interface JobCardProps {
  job: Job;
}

export const JobCard = ({ job }: JobCardProps) => {
  const { currentUser, isAuthenticated } = useUserStore();
  const { getOrCreateConversation } = useMessageStore();
  const [showChat, setShowChat] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const handleContact = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated && currentUser) {
      const convId = getOrCreateConversation(currentUser.id, job.employerId);
      setConversationId(convId);
      setShowChat(true);
    }
  };

  return (
    <>
      <Link to={`/app/jobs/${job.id}`}>
        <div 
          className="bg-white rounded-2xl transition-all duration-300 p-4 sm:p-6 group cursor-pointer"
          style={{ 
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4 flex-1">
              <img
                src={job.companyLogo || '/images/companies/default_company.jpg'}
                alt={job.company}
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div className="flex-1">
                <h3 className="font-heading text-xl font-bold mb-1 transition-colors" style={{ color: '#333A2F' }}>
                  {job.title}
                </h3>
                <p className="mb-2" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>{job.company}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{job.type}</span>
                  </div>
                  {job.salary && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>{job.salary}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {isAuthenticated && isCandidateRole(currentUser?.role) && (
              <button
                onClick={handleContact}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#EBEDDF', color: '#333A2F' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#333A2F';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#EBEDDF';
                  e.currentTarget.style.color = '#333A2F';
                }}
                title="Contact employer"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}
          </div>

          <p className="mb-4 line-clamp-2" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>{job.description}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {job.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{ backgroundColor: '#EBEDDF', color: '#333A2F' }}
              >
                {tag}
              </span>
            ))}
            {job.tags.length > 4 && (
              <span className="px-3 py-1 rounded-lg text-xs" style={{ backgroundColor: '#EBEDDF', color: 'rgba(51, 58, 47, 0.7)' }}>
                +{job.tags.length - 4} more
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
            <span>Posted {new Date(job.postedAt).toLocaleDateString()}</span>
            <span>{job.applicationsCount} applications</span>
          </div>
        </div>
      </Link>

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
