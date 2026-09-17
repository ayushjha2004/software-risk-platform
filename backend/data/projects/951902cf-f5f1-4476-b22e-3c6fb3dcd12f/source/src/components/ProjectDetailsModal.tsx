import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  DollarSign,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle,
  Clock,
  Send,
  Star,
  User,
  ArrowRight,
  Sparkles,
  Award,
  Bookmark,
} from 'lucide-react';
import { Project, Bid, UserProfile, Contract } from '../types';
import { api } from '../services/api';
import { useSavedProjects } from '../utils/savedProjects';
import { BidModal, getProposalDraftKey, ACTIVE_BID_MODAL_KEY } from './BidModal';
import { CompetitiveBiddingChart } from './CompetitiveBiddingChart';
import { BiddingActivityChart } from './BiddingActivityChart';

interface ProjectDetailsModalProps {
  project: Project | null;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToContract: (contractId: string) => void;
  onRefreshProjects: () => void;
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  project,
  currentUser,
  isOpen,
  onClose,
  onNavigateToContract,
  onRefreshProjects,
}) => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isBidModalOpen, setIsBidModalOpen] = useState<boolean>(false);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(false);
  const { isSaved, toggle } = useSavedProjects();

  useEffect(() => {
    if (project && isOpen) {
      loadProjectDetails();

      // Check if user has an auto-saved draft for this project
      try {
        const draftKey = getProposalDraftKey(project.id, currentUser.id);
        const saved = localStorage.getItem(draftKey);
        setHasSavedDraft(Boolean(saved));

        // Reopen bid proposal modal if user refreshed while writing proposal
        const activeModalProj = localStorage.getItem(ACTIVE_BID_MODAL_KEY);
        if (activeModalProj === project.id && currentUser.role === 'freelancer') {
          setIsBidModalOpen(true);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [project, isOpen, currentUser.id, currentUser.role]);

  const loadProjectDetails = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const data = await api.getProject(project.id);
      setBids(data.bids || []);
      setContract(data.contract || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !project) return null;

  const handleAcceptBid = async (bidId: string) => {
    setAcceptingBidId(bidId);
    try {
      const result = await api.acceptBid(bidId);
      setFeedbackMsg('Bid accepted! Milestone-based contract created and first milestone funded in Escrow.');
      await loadProjectDetails();
      onRefreshProjects();
      setTimeout(() => {
        onNavigateToContract(result.contract.id);
      }, 1200);
    } catch (err) {
      console.error(err);
      setFeedbackMsg('Failed to accept bid.');
    } finally {
      setAcceptingBidId(null);
    }
  };

  const isClientOwner = currentUser.id === project.clientId;
  const userHasBid = bids.some((b) => b.freelancerId === currentUser.id);

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
          {/* Top Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20">
                {project.category}
              </span>
              <span className="text-xs text-slate-400 capitalize">
                {project.budgetType} Escrow Contract
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id={`modal-bookmark-btn-${project.id}`}
                onClick={() => toggle(project.id)}
                aria-label={
                  isSaved(project.id)
                    ? `Remove ${project.title} from saved projects`
                    : `Save ${project.title} to bookmarks`
                }
                title={isSaved(project.id) ? 'Saved to bookmarks' : 'Save project'}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
                  isSaved(project.id)
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Bookmark
                  className={`w-3.5 h-3.5 ${
                    isSaved(project.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                  }`}
                />
                <span>{isSaved(project.id) ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
            {feedbackMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedbackMsg}</span>
              </div>
            )}

            {/* Title & Actions bar */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {project.clientName} ({project.clientCompany || 'Client'})
                  </span>
                  <span>★ {project.clientRating.toFixed(1)} Client Rating</span>
                  <span>{project.clientLocation}</span>
                  <span>Posted {new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Status / CTA */}
              <div className="shrink-0 flex items-center gap-2">
                {project.contractId && (
                  <button
                    onClick={() => onNavigateToContract(project.contractId!)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span>Open Contract Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {!project.contractId && project.status === 'open' && currentUser.role === 'freelancer' && (
                  <button
                    onClick={() => setIsBidModalOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {hasSavedDraft
                        ? 'Resume Drafted Proposal'
                        : userHasBid
                        ? 'Submit Updated Bid'
                        : 'Submit Proposal'}
                    </span>
                    {hasSavedDraft && (
                      <span className="bg-amber-400 text-slate-900 font-bold text-[10px] px-1.5 py-0.5 rounded-full ml-1 leading-none">
                        Draft Saved
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Key Metrics Bento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                  Budget Range
                </span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">
                  ${project.budgetMin.toLocaleString()} - ${project.budgetMax.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 capitalize">
                  {project.budgetType} billing
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                  Total Proposals
                </span>
                <span className="text-base font-bold text-indigo-700 mt-0.5 block">
                  {bids.length} Submitted
                </span>
                <span className="text-[10px] text-slate-500">
                  Avg: ${project.avgBidAmount ? project.avgBidAmount.toLocaleString() : '---'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                  Timeline
                </span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">
                  {project.duration}
                </span>
                <span className="text-[10px] text-slate-500">
                  Level: {project.experienceLevel}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Escrow Protected
                </span>
                <span className="text-xs font-bold text-emerald-950 mt-1 block">
                  Milestone Secured
                </span>
                <span className="text-[10px] text-emerald-700">
                  Funds released on approval
                </span>
              </div>
            </div>

            {/* Scope & Description */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Project Scope & Requirements
              </h3>
              <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {project.description}
              </div>
            </div>

            {/* Required Skills */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Required Technical Competencies
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {project.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Milestone Contract Outline */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target Milestone Schedule ({project.initialMilestones?.length || 0})
                </h3>
                <span className="text-xs text-indigo-600 font-medium">
                  Guaranteed via Bid Forge Escrow
                </span>
              </div>

              <div className="space-y-2">
                {project.initialMilestones?.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900">{m.title}</h4>
                        <p className="text-slate-500 mt-0.5">{m.description}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 text-sm block">
                        ${m.amount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Target: {m.dueDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Bidding Activity Analytics (Recharts 7-Day Velocity Graph) */}
            <div className="pt-4 border-t border-slate-200">
              <BiddingActivityChart project={project} bids={bids} />
            </div>

            {/* Competitive Bidding Statistics & D3 Visual Analytics */}
            <div className="pt-4 border-t border-slate-200">
              <CompetitiveBiddingChart project={project} bids={bids} />
            </div>

            {/* Bids & Proposals Section */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Proposals & Bids ({bids.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isClientOwner
                      ? 'Review freelancer proposals, compare milestone breakdowns, and award the contract.'
                      : 'Competitive proposals submitted by verified Bid Forge freelancers.'}
                  </p>
                </div>
              </div>

              {bids.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                  No bids have been submitted yet. Be the first to submit a proposal!
                </div>
              ) : (
                <div className="space-y-3">
                  {bids.map((bid) => {
                    const isAccepted = bid.status === 'accepted';
                    return (
                      <div
                        key={bid.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isAccepted
                            ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={bid.freelancerAvatar}
                              alt={bid.freelancerName}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-slate-900">
                                  {bid.freelancerName}
                                </span>
                                <span className="text-amber-500 text-xs font-semibold">
                                  ★ {bid.freelancerRating.toFixed(1)}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  ({bid.freelancerCompletedJobs} jobs completed)
                                </span>
                              </div>
                              <span className="text-xs text-slate-500">{bid.freelancerTitle}</span>
                            </div>
                          </div>

                          <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-2">
                            <div>
                              <span className="text-base font-bold text-slate-900 block leading-none">
                                ${bid.bidAmount.toLocaleString()}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                in {bid.estimatedDeliveryDays} days
                              </span>
                            </div>

                            {/* Award Button for Client */}
                            {isClientOwner && project.status === 'open' && (
                              <button
                                onClick={() => handleAcceptBid(bid.id)}
                                disabled={acceptingBidId === bid.id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>
                                  {acceptingBidId === bid.id ? 'Accepting...' : 'Accept & Award'}
                                </span>
                              </button>
                            )}

                            {isAccepted && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Awarded & Active
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Cover Letter */}
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-100 mb-3 whitespace-pre-line">
                          {bid.coverLetter}
                        </p>

                        {/* Proposed Milestones */}
                        {bid.proposedMilestones && bid.proposedMilestones.length > 0 && (
                          <div className="text-xs">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                              Proposed Milestone Terms ({bid.proposedMilestones.length}):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {bid.proposedMilestones.map((pm, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="p-2 bg-slate-100/70 border border-slate-200 rounded-md flex items-center justify-between text-[11px]"
                                >
                                  <span className="font-medium text-slate-800 line-clamp-1">
                                    {pm.title}
                                  </span>
                                  <span className="font-bold text-slate-900 ml-2 shrink-0">
                                    ${pm.amount.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Freelancer Bid Modal */}
      {isBidModalOpen && (
        <BidModal
          project={project}
          currentUser={currentUser}
          isOpen={isBidModalOpen}
          onClose={() => {
            setIsBidModalOpen(false);
            try {
              const draftKey = getProposalDraftKey(project.id, currentUser.id);
              setHasSavedDraft(Boolean(localStorage.getItem(draftKey)));
            } catch (e) {
              // ignore
            }
          }}
          onBidSubmitted={() => {
            setHasSavedDraft(false);
            loadProjectDetails();
            onRefreshProjects();
            setFeedbackMsg('Your proposal has been successfully submitted to the client!');
          }}
        />
      )}
    </>
  );
};
