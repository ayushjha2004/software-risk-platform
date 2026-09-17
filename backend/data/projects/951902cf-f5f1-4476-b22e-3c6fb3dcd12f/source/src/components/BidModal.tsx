import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  DollarSign,
  Calendar,
  Layers,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Link2,
  RotateCcw,
  Clock,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Project, UserProfile, BidMilestoneProposal } from '../types';
import { api } from '../services/api';

export const DRAFT_KEY_PREFIX = 'bid_forge_proposal_draft_';
export const ACTIVE_BID_MODAL_KEY = 'bid_forge_active_bid_project_id';

export const getProposalDraftKey = (projectId: string, userId: string) =>
  `${DRAFT_KEY_PREFIX}${projectId}_${userId}`;

export interface ProposalDraft {
  projectId: string;
  userId: string;
  bidAmount: number;
  estimatedDays: number;
  coverLetter: string;
  portfolioLink: string;
  milestones: BidMilestoneProposal[];
  aiHighlights?: string[];
  savedAt: string;
}

interface BidModalProps {
  project: Project;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onBidSubmitted: () => void;
}

export const BidModal: React.FC<BidModalProps> = ({
  project,
  currentUser,
  isOpen,
  onClose,
  onBidSubmitted,
}) => {
  const defaultBidAmount = Math.round((project.budgetMin + project.budgetMax) / 2);
  const defaultEstimatedDays = 21;
  const defaultPortfolioLink = 'https://github.com/profile';
  const defaultMilestones: BidMilestoneProposal[] = [
    {
      title: 'Milestone 1: Architectural Specification & Foundation',
      amount: Math.round(((project.budgetMin + project.budgetMax) / 2) * 0.35),
      deliveryDays: 7,
    },
    {
      title: 'Milestone 2: Core Feature Implementation & Testing',
      amount: Math.round(((project.budgetMin + project.budgetMax) / 2) * 0.45),
      deliveryDays: 10,
    },
    {
      title: 'Milestone 3: Final Delivery, Deployment & Documentation',
      amount: Math.round(((project.budgetMin + project.budgetMax) / 2) * 0.2),
      deliveryDays: 4,
    },
  ];

  const [bidAmount, setBidAmount] = useState<number>(defaultBidAmount);
  const [estimatedDays, setEstimatedDays] = useState<number>(defaultEstimatedDays);
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [portfolioLink, setPortfolioLink] = useState<string>(defaultPortfolioLink);
  const [milestones, setMilestones] = useState<BidMilestoneProposal[]>(defaultMilestones);

  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiHighlights, setAiHighlights] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-Save States
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedText, setLastSavedText] = useState<string | null>(null);
  const [isDraftRestored, setIsDraftRestored] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  const isFirstRender = useRef(true);

  // Restore draft on mount or open
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
      isFirstRender.current = true;
      return;
    }

    try {
      localStorage.setItem(ACTIVE_BID_MODAL_KEY, project.id);
    } catch (e) {
      // Storage access may fail in restrictive environments
    }

    const draftKey = getProposalDraftKey(project.id, currentUser.id);
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        const parsed = JSON.parse(stored) as ProposalDraft;
        if (parsed && parsed.projectId === project.id) {
          if (typeof parsed.bidAmount === 'number') setBidAmount(parsed.bidAmount);
          if (typeof parsed.estimatedDays === 'number') setEstimatedDays(parsed.estimatedDays);
          if (typeof parsed.coverLetter === 'string') setCoverLetter(parsed.coverLetter);
          if (typeof parsed.portfolioLink === 'string') setPortfolioLink(parsed.portfolioLink);
          if (Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
            setMilestones(parsed.milestones);
          }
          if (Array.isArray(parsed.aiHighlights)) {
            setAiHighlights(parsed.aiHighlights);
          }
          if (parsed.savedAt) {
            const timeFormatted = new Date(parsed.savedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            setLastSavedText(`Saved ${timeFormatted}`);
          }
          setIsDraftRestored(true);
          setDraftStatus('saved');
        }
      }
    } catch (err) {
      console.warn('Failed to read proposal draft from localStorage', err);
    } finally {
      setHasInitialized(true);
      // Wait a tick before enabling auto-save to prevent overwriting with initial state
      setTimeout(() => {
        isFirstRender.current = false;
      }, 300);
    }
  }, [isOpen, project.id, currentUser.id]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!isOpen || !hasInitialized || isFirstRender.current) return;

    // Check if form is untouched compared to initial defaults
    const isUntouched =
      !coverLetter.trim() &&
      bidAmount === defaultBidAmount &&
      estimatedDays === defaultEstimatedDays &&
      portfolioLink === defaultPortfolioLink &&
      aiHighlights.length === 0 &&
      !isDraftRestored;

    if (isUntouched) {
      return;
    }

    setDraftStatus('saving');
    const timer = setTimeout(() => {
      try {
        const draftKey = getProposalDraftKey(project.id, currentUser.id);
        const draftData: ProposalDraft = {
          projectId: project.id,
          userId: currentUser.id,
          bidAmount,
          estimatedDays,
          coverLetter,
          portfolioLink,
          milestones,
          aiHighlights,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        const timeFormatted = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSavedText(`Saved ${timeFormatted}`);
        setDraftStatus('saved');
      } catch (err) {
        console.warn('Failed to auto-save proposal draft to localStorage', err);
        setDraftStatus('idle');
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    hasInitialized,
    bidAmount,
    estimatedDays,
    coverLetter,
    portfolioLink,
    milestones,
    aiHighlights,
    project.id,
    currentUser.id,
    isDraftRestored,
  ]);

  if (!isOpen) return null;

  const handleClose = () => {
    try {
      localStorage.removeItem(ACTIVE_BID_MODAL_KEY);
    } catch (e) {
      // ignore
    }
    onClose();
  };

  const handleDiscardDraft = () => {
    try {
      const draftKey = getProposalDraftKey(project.id, currentUser.id);
      localStorage.removeItem(draftKey);
    } catch (err) {
      // ignore
    }

    // Reset to defaults
    setBidAmount(defaultBidAmount);
    setEstimatedDays(defaultEstimatedDays);
    setCoverLetter('');
    setPortfolioLink(defaultPortfolioLink);
    setMilestones(defaultMilestones);
    setAiHighlights([]);
    setIsDraftRestored(false);
    setLastSavedText(null);
    setDraftStatus('idle');
  };

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        title: `Milestone ${milestones.length + 1}: Deliverable`,
        amount: 500,
        deliveryDays: 7,
      },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (
    index: number,
    field: keyof BidMilestoneProposal,
    value: string | number
  ) => {
    const updated = [...milestones];
    updated[index] = {
      ...updated[index],
      [field]: field === 'amount' || field === 'deliveryDays' ? Number(value) : value,
    };
    setMilestones(updated);
  };

  const totalMilestonesAmount = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const handleGenerateProposalWithAI = async () => {
    setIsGeneratingAI(true);
    setError(null);
    try {
      const result = await api.craftProposalAI({
        projectTitle: project.title,
        projectDescription: project.description,
        skills: project.skills,
        budgetRange: `$${project.budgetMin} - $${project.budgetMax}`,
        freelancerExperience: `${currentUser.title} with 100% milestone completion rate`,
      });

      if (result.coverLetter) {
        setCoverLetter(result.coverLetter);
      }
      if (result.suggestedBidAmount) {
        setBidAmount(result.suggestedBidAmount);
      }
      if (result.estimatedDays) {
        setEstimatedDays(result.estimatedDays);
      }
      if (result.keyHighlights && result.keyHighlights.length > 0) {
        setAiHighlights(result.keyHighlights);
      }
      if (result.milestoneBreakdown && result.milestoneBreakdown.length > 0) {
        setMilestones(
          result.milestoneBreakdown.map((m) => ({
            title: m.title,
            amount: m.amount,
            deliveryDays: m.days || 7,
          }))
        );
      }
    } catch (err: any) {
      console.error(err);
      setError('Could not generate AI proposal. You can still write one manually.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverLetter.trim()) {
      setError('Please provide a cover letter detailing your approach.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.submitBid({
        projectId: project.id,
        freelancerId: currentUser.id,
        bidAmount,
        estimatedDeliveryDays: estimatedDays,
        coverLetter,
        proposedMilestones: milestones,
        portfolioLinks: [portfolioLink],
      });

      // Clear draft on successful submission
      try {
        const draftKey = getProposalDraftKey(project.id, currentUser.id);
        localStorage.removeItem(draftKey);
        localStorage.removeItem(ACTIVE_BID_MODAL_KEY);
      } catch (err) {
        // ignore
      }

      onBidSubmitted();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Failed to submit proposal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">
                Submit Job Proposal
              </span>

              {/* Auto-Save Indicator Badge */}
              {draftStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full animate-pulse font-medium">
                  <Clock className="w-3 h-3 animate-spin" />
                  Auto-saving...
                </span>
              )}
              {draftStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  <Check className="w-3 h-3 text-emerald-400" />
                  {lastSavedText || 'Draft auto-saved'}
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-white leading-tight mt-0.5">
              {project.title}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitBid} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Draft Restored Banner */}
          {isDraftRestored && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 text-amber-900 font-medium">
                <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Draft restored from your previous session ({lastSavedText || 'auto-saved locally'}).
                </span>
              </div>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="text-amber-800 hover:text-red-600 font-semibold underline shrink-0 hover:no-underline text-xs"
              >
                Discard Draft
              </button>
            </div>
          )}

          {/* Project Budget Reference */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Client Budget:</span>
              <span className="font-bold text-slate-800 ml-1.5">
                ${project.budgetMin.toLocaleString()} - ${project.budgetMax.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Contract Type:</span>
              <span className="font-semibold text-indigo-700 capitalize ml-1.5">
                {project.budgetType} Escrow
              </span>
            </div>
            <div>
              <span className="text-slate-500">Proposals:</span>
              <span className="font-semibold text-slate-800 ml-1.5">
                {project.bidsCount} submitted
              </span>
            </div>
          </div>

          {/* AI Generator Banner */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 border border-indigo-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-indigo-900 font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI Bid Proposal Strategist</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Auto-generate an expert cover letter, tailored milestone terms, and value propositions based on client requirements.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateProposalWithAI}
              disabled={isGeneratingAI}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAI ? 'Crafting Proposal...' : 'Craft with Gemini'}</span>
            </button>
          </div>

          {aiHighlights.length > 0 && (
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
              <span className="text-xs font-bold text-indigo-900">
                Key Value Highlights generated by AI:
              </span>
              <ul className="mt-1 space-y-1">
                {aiHighlights.map((hl, i) => (
                  <li key={i} className="text-xs text-indigo-800 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{hl}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pricing & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Your Total Bid Amount ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-medium">$</span>
                <input
                  type="number"
                  required
                  min={100}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Total milestone amounts sum to: ${totalMilestonesAmount.toLocaleString()}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Estimated Delivery (Days)
              </label>
              <input
                type="number"
                required
                min={1}
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Milestone Proposal Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Milestone Contract Schedule
              </label>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Milestone</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-2.5">
              Specify each deliverable stage. Funds are held in Bid Forge Escrow and released only after client approval.
            </p>

            <div className="space-y-2">
              {milestones.map((m, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <span className="font-bold text-slate-400 w-5 text-center">{index + 1}</span>
                  <input
                    type="text"
                    required
                    placeholder="Milestone Deliverable Title"
                    value={m.title}
                    onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                  <div className="w-24 relative">
                    <span className="absolute left-2 top-1.5 text-slate-400">$</span>
                    <input
                      type="number"
                      required
                      min={50}
                      placeholder="Amount"
                      value={m.amount}
                      onChange={(e) => handleMilestoneChange(index, 'amount', e.target.value)}
                      className="w-full pl-5 pr-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                  <div className="w-20 relative">
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="Days"
                      value={m.deliveryDays}
                      onChange={(e) => handleMilestoneChange(index, 'deliveryDays', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">d</span>
                  </div>
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMilestone(index)}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="Delete milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cover Letter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Cover Letter & Approach
              </label>
              <span className="text-[11px] text-slate-400">
                Showcase relevant experience and milestone execution plan
              </span>
            </div>
            <textarea
              required
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Introduce yourself, explain your technical implementation strategy, and describe how you will deliver each milestone..."
              className="w-full p-3 border border-slate-300 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
            />
          </div>

          {/* Portfolio Link */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Portfolio / GitHub Work Repository
            </label>
            <div className="relative">
              <Link2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="url"
                value={portfolioLink}
                onChange={(e) => setPortfolioLink(e.target.value)}
                placeholder="https://github.com/your-username/sample-project"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Action Buttons & Save Status */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Changes auto-save locally to prevent work loss</span>
              {(isDraftRestored || lastSavedText) && (
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="text-red-600 hover:text-red-700 font-medium ml-2 underline text-[11px]"
                >
                  Discard Draft
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Submitting Bid...</span>
                ) : (
                  <span>Submit Proposal & Terms</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
