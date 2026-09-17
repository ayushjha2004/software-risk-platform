import React from 'react';
import {
  Calendar,
  Clock,
  DollarSign,
  ShieldCheck,
  Tag,
  Users,
  ChevronRight,
  Layers,
  Sparkles,
  Bookmark,
  TrendingUp,
} from 'lucide-react';
import { Project, UserProfile } from '../types';
import { useSavedProjects } from '../utils/savedProjects';

interface ProjectCardProps {
  project: Project;
  onSelectProject: (project: Project) => void;
  currentUser: UserProfile;
  isBookmarked?: boolean;
  onToggleBookmark?: (projectId: string, e?: React.MouseEvent) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelectProject,
  currentUser,
  isBookmarked: propIsBookmarked,
  onToggleBookmark,
}) => {
  const { isSaved: checkIsSaved, toggle } = useSavedProjects();

  // Support controlled or standalone bookmark state
  const isBookmarked =
    propIsBookmarked !== undefined ? propIsBookmarked : checkIsSaved(project.id);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onToggleBookmark) {
      onToggleBookmark(project.id, e);
    } else {
      toggle(project.id);
    }
  };

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'open':
        return {
          label: 'Accepting Bids',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'in_progress':
        return {
          label: 'Contract Active',
          classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'completed':
        return {
          label: 'Completed',
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      case 'disputed':
        return {
          label: 'In Mediation',
          classes: 'bg-amber-50 text-amber-800 border-amber-300',
        };
      default:
        return {
          label: status,
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const getCompetitionBadge = (bidsCount: number) => {
    if (bidsCount >= 6) {
      return {
        label: 'High Competition',
        classes: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }
    if (bidsCount >= 3) {
      return {
        label: 'Moderate Competition',
        classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    }
    return {
      label: 'Early Stage',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  };

  const statusInfo = getStatusBadge(project.status);
  const competitionInfo = getCompetitionBadge(project.bidsCount);

  return (
    <div
      id={`project-card-${project.id}`}
      onClick={() => onSelectProject(project)}
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-xl hover:shadow-slate-200/80 hover:border-indigo-200/80 hover:scale-[1.015] hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between group will-change-transform"
    >
      <div>
        {/* Top bar: Category, Status, Budget & Bookmark */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {project.category}
            </span>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusInfo.classes}`}
            >
              {statusInfo.label}
            </span>
            {isBookmarked && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs">
                <Bookmark className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                Saved
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <div className="text-base font-bold text-slate-900 flex items-center gap-0.5 justify-end">
                <span>${project.budgetMin.toLocaleString()}</span>
                <span className="text-slate-400 font-normal">-</span>
                <span>${project.budgetMax.toLocaleString()}</span>
              </div>
              <span className="text-[11px] text-slate-500 capitalize">
                {project.budgetType} Contract
              </span>
            </div>

            {/* Bookmark Action Button */}
            <button
              type="button"
              id={`bookmark-btn-${project.id}`}
              onClick={handleBookmarkClick}
              aria-label={
                isBookmarked
                  ? `Remove ${project.title} from saved list`
                  : `Save ${project.title} to bookmarks`
              }
              title={isBookmarked ? 'Saved to bookmarks' : 'Save project'}
              className={`p-2 rounded-xl border transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-50 border-amber-300 text-amber-600 shadow-2xs hover:bg-amber-100 hover:border-amber-400 ring-2 ring-amber-400/20'
                  : 'bg-slate-50/80 border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50/50'
              }`}
            >
              <Bookmark
                className={`w-4 h-4 transition-transform duration-200 ${
                  isBookmarked
                    ? 'fill-amber-500 text-amber-500 scale-105'
                    : 'group-hover:scale-105'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-2">
          {project.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
          {project.description}
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {project.skills.slice(0, 5).map((skill, idx) => (
            <span
              key={idx}
              className="text-[11px] font-medium bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
            >
              {skill}
            </span>
          ))}
          {project.skills.length > 5 && (
            <span className="text-[11px] text-slate-400 px-1 py-0.5">
              +{project.skills.length - 5} more
            </span>
          )}
        </div>

        {/* Quick Stats Preview: Active Bids & Average Bid Amount */}
        <div
          id={`project-quick-stats-${project.id}`}
          className="mb-4 p-3 rounded-xl bg-slate-50/90 border border-slate-200/90 flex flex-col gap-2 transition-colors group-hover:bg-indigo-50/20 group-hover:border-indigo-100"
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-slate-700 font-bold">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Quick Stats</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${competitionInfo.classes}`}>
              {competitionInfo.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/70">
            {/* Active Bids */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 block font-medium uppercase tracking-wide">
                  Active Bids
                </span>
                <div className="text-xs font-bold text-slate-900 flex items-baseline gap-1">
                  <span className="text-sm font-extrabold">{project.bidsCount}</span>
                  <span className="text-[11px] font-normal text-slate-500 truncate">
                    {project.bidsCount === 1 ? 'proposal' : 'proposals'}
                  </span>
                </div>
              </div>
            </div>

            {/* Average Bid Amount */}
            <div className="flex items-center gap-2.5 border-l border-slate-200/80 pl-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 block font-medium uppercase tracking-wide">
                  Avg Bid Amount
                </span>
                <div className="text-xs font-bold text-slate-900 flex items-baseline gap-1 truncate">
                  <span className="text-sm font-extrabold text-emerald-700">
                    ${project.avgBidAmount > 0 ? project.avgBidAmount.toLocaleString() : '—'}
                  </span>
                  {project.avgBidAmount > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-1 py-0.2 rounded">
                      avg
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Details */}
      <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        {/* Client info & milestone count */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-700">{project.clientName}</span>
            <span className="text-amber-500 font-medium">★ {project.clientRating.toFixed(1)}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-600">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>{project.initialMilestones?.length || 2} Milestones</span>
          </div>
        </div>

        {/* Duration & Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{project.duration}</span>
          </div>

          <span className="inline-flex items-center text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
            View Details <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
