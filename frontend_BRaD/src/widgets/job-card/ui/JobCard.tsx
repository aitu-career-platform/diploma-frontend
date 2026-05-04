import { MapPin, Clock, DollarSign, Heart, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Job } from '@entities/job';
import { isCandidateRole, useUserStore } from '@entities/user';
import { useFavoritesStore } from '@entities/favorite';

interface JobCardProps {
  job: Job;
}

export const JobCard = ({ job }: JobCardProps) => {
  const { currentUser, isAuthenticated } = useUserStore();
  const { favoriteIds, countsByVacancyId, toggleFavorite, isMutating } = useFavoritesStore();
  const isCandidate = isAuthenticated && isCandidateRole(currentUser?.role);
  const isFavorite = favoriteIds.has(job.id);
  const favoritesCount = countsByVacancyId[job.id] ?? job.favoritesCount ?? 0;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isCandidate) {
      return;
    }

    try {
      await toggleFavorite(job.id);
    } catch {
      // Page-level surfaces already render readable API errors where needed.
    }
  };

  return (
    <Link to={`/app/jobs/${job.id}`} className="app-section-card app-lift block overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <img
            src={job.companyLogo || '/images/companies/default_company.jpg'}
            alt={job.company}
            className="h-14 w-14 rounded-xl border border-[#2B3B23]/10 object-cover"
          />
          <div className="min-w-0">
            <h3 className="app-title truncate text-lg">{job.title}</h3>
            <p className="app-text-muted truncate text-sm">{job.company}</p>
          </div>
        </div>

        {isCandidate && (
          <button
            onClick={handleToggleFavorite}
            disabled={isMutating}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
              isFavorite
                ? 'border-[#1F2B18] bg-[#1F2B18] text-white'
                : 'border-[#2B3B23]/15 bg-[#F1F6E4] text-[#2B3B23] hover:bg-[#E5EED2]'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          >
            <Heart className="h-4 w-4" style={{ fill: isFavorite ? 'currentColor' : 'transparent' }} />
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-[#526347]">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#9FB08A]/35 bg-[#F5F9EB] px-2.5 py-1">
          <MapPin className="h-3.5 w-3.5" />
          {job.location}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#9FB08A]/35 bg-[#F5F9EB] px-2.5 py-1">
          <Clock className="h-3.5 w-3.5" />
          {job.type}
        </span>
        {job.salary && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#9FB08A]/35 bg-[#F5F9EB] px-2.5 py-1">
            <DollarSign className="h-3.5 w-3.5" />
            {job.salary}
          </span>
        )}
      </div>

      <p className="app-text-muted mb-4 line-clamp-3 text-sm leading-6">{job.description}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {job.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-full bg-[#E8F0D8] px-2.5 py-1 text-xs font-semibold text-[#2D3D25]">
            {tag}
          </span>
        ))}
        {job.tags.length > 4 && (
          <span className="rounded-full bg-[#EDF3DD] px-2.5 py-1 text-xs font-semibold text-[#546746]">
            +{job.tags.length - 4}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[#2B3B23]/8 pt-3 text-xs text-[#637559]">
        <span>Posted {new Date(job.postedAt).toLocaleDateString()}</span>
        <div className="flex items-center gap-3 font-semibold">
          <span>{job.applicationsCount} applied</span>
          <span>{favoritesCount} saved</span>
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#2B6A4D]">
        Open details
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </Link>
  );
};
