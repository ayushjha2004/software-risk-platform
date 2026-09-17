import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Scale,
  FileText,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  DollarSign,
  User,
  ArrowRight,
  Gavel,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Dispute, UserProfile, DisputeResolutionOutcome } from '../types';
import { api } from '../services/api';
import { INITIAL_DISPUTES } from '../data/initialData';

interface DisputeMediationCenterProps {
  currentUser: UserProfile;
  initialDisputeId?: string;
  onNavigateToContract: (contractId: string) => void;
}

export const DisputeMediationCenter: React.FC<DisputeMediationCenterProps> = ({
  currentUser,
  initialDisputeId,
  onNavigateToContract,
}) => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'under_review' | 'resolved'>('all');

  // AI Mediation Assistant State
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    caseSummary: string;
    keyFindings: string[];
    recommendedOutcome: 'RELEASE_TO_FREELANCER' | 'REFUND_CLIENT' | 'SPLIT_50_50';
    suggestedFreelancerPayout: number;
    suggestedClientRefund: number;
    mediationRationale: string;
  } | null>(null);

  // Admin Ruling Controls
  const [selectedOutcome, setSelectedOutcome] = useState<DisputeResolutionOutcome>('SPLIT_50_50');
  const [mediatorNotes, setMediatorNotes] = useState(
    'After reviewing the benchmark load tests and the agreed SLA clause 4.2, the core service was functional, but optimization under peak load was left uncompleted. Escrow is apportioned 50/50 to compensate genuine engineering time while granting client credit for caching work.'
  );
  const [customFreelancerPayout, setCustomFreelancerPayout] = useState(1400);
  const [customClientRefund, setCustomClientRefund] = useState(1400);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionSuccess, setResolutionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const data = await api.getDisputes();
      const validData = data && data.length > 0 ? data : INITIAL_DISPUTES;
      setDisputes(validData);
      if (initialDisputeId) {
        const found = validData.find((d) => d.id === initialDisputeId);
        if (found) setSelectedDispute(found);
        else if (validData.length > 0) setSelectedDispute(validData[0]);
      } else if (validData.length > 0) {
        setSelectedDispute(validData[0]);
      }
    } catch (err) {
      console.warn('Failed to load disputes from network, using initial dataset', err);
      setDisputes(INITIAL_DISPUTES);
      if (INITIAL_DISPUTES.length > 0) {
        setSelectedDispute(INITIAL_DISPUTES[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunAIAnalysis = async () => {
    if (!selectedDispute) return;
    setIsAnalyzingAI(true);
    try {
      const result = await api.analyzeDisputeAI({
        disputeReason: selectedDispute.reason,
        description: selectedDispute.description,
        evidenceSummary: selectedDispute.evidence?.map((e) => `${e.title}: ${e.description}`).join('; ') || '',
        contractAmount: selectedDispute.amountInDispute,
      });

      setAiAnalysis(result);
      if (result.recommendedOutcome) {
        setSelectedOutcome(result.recommendedOutcome);
      }
      if (result.mediationRationale) {
        setMediatorNotes(result.mediationRationale);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;
    setIsResolving(true);
    try {
      const result = await api.resolveDispute(selectedDispute.id, {
        outcome: selectedOutcome,
        mediatorNotes,
        freelancerPayout:
          selectedOutcome === 'RELEASE_TO_FREELANCER'
            ? selectedDispute.amountInDispute
            : selectedOutcome === 'SPLIT_50_50'
            ? Math.round(selectedDispute.amountInDispute / 2)
            : selectedOutcome === 'CUSTOM_SPLIT'
            ? customFreelancerPayout
            : 0,
        clientRefund:
          selectedOutcome === 'REFUND_CLIENT'
            ? selectedDispute.amountInDispute
            : selectedOutcome === 'SPLIT_50_50'
            ? Math.round(selectedDispute.amountInDispute / 2)
            : selectedOutcome === 'CUSTOM_SPLIT'
            ? customClientRefund
            : 0,
      });

      setSelectedDispute(result.dispute);
      setResolutionSuccess(
        `Ruling executed! Escrow funds reallocated (${selectedOutcome}). Both parties notified.`
      );
      await loadDisputes();
    } catch (err) {
      console.error(err);
      setResolutionSuccess('Failed to execute resolution.');
    } finally {
      setIsResolving(false);
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    if (filter === 'under_review') return d.status === 'open' || d.status === 'under_review';
    if (filter === 'resolved') return d.status === 'resolved';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Philosophy */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Scale className="w-4 h-4" />
              </span>
              <span className="text-xs uppercase tracking-wider font-bold text-amber-400">
                Fairness & Neutral Arbitration System
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Bid Forge Dispute Resolution & Escrow Mediation
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              When deliverables or scope boundaries are contested, Bid Forge provides impartial admin mediation. Escrow funds are secured safely while contracts, benchmark proofs, and communication logs are arbitrated.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3 bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-xl border border-slate-700">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
              alt="Marcus Vance"
              className="w-11 h-11 rounded-full object-cover ring-2 ring-amber-400/50"
            />
            <div className="text-xs">
              <span className="font-bold text-white block">Marcus Vance</span>
              <span className="text-[11px] text-amber-300">Chief Trust & Arbitration Officer</span>
              <span className="text-[10px] text-slate-400 block">142 Cases Mediated • 99.4% Fairness Rating</span>
            </div>
          </div>
        </div>
      </div>

      {resolutionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resolutionSuccess}</span>
          </div>
          <button
            onClick={() => setResolutionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Cases List & Selected Case Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dispute Cases List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Dispute Cases ({filteredDisputes.length})
            </h3>
            {/* Filter */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px]">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  filter === 'all' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('under_review')}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  filter === 'under_review' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('resolved')}
                className={`px-2 py-1 rounded-md font-medium transition-all ${
                  filter === 'resolved' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredDisputes.map((d) => {
              const isSelected = selectedDispute?.id === d.id;
              const isResolved = d.status === 'resolved';

              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDispute(d)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-bold text-slate-400">Case #{d.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold capitalize ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {isResolved ? 'Resolved' : 'In Arbitration'}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1 mb-1">
                    {d.projectTitle}
                  </h4>

                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mb-3">
                    {d.reason}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-500">
                    <span>
                      Escrow:{' '}
                      <strong className="text-slate-900 font-bold">
                        ${d.amountInDispute.toLocaleString()}
                      </strong>
                    </span>
                    <span>By {d.raisedBy.name.split(' ')[0]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Case Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedDispute ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-xs text-slate-500">
              Select a dispute case from the left to view arbitration evidence and mediation options.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              {/* Case Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Case #{selectedDispute.id}
                    </span>
                    <span className="text-xs text-slate-400">
                      Opened {new Date(selectedDispute.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedDispute.projectTitle}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">
                    Milestone: {selectedDispute.milestoneTitle || 'General Contract Scope'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
                    Escrow Locked in Dispute
                  </span>
                  <span className="text-2xl font-bold text-amber-600 block">
                    ${selectedDispute.amountInDispute.toLocaleString()}
                  </span>
                  <button
                    onClick={() => onNavigateToContract(selectedDispute.contractId)}
                    className="mt-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    <span>View Contract Workspace</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Disputing Parties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Filing Party (Claimant)
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                      {selectedDispute.raisedBy?.name ? selectedDispute.raisedBy.name[0] : 'U'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {selectedDispute.raisedBy?.name || 'Complainant'}
                      </span>
                      <span className="text-[11px] text-slate-500 capitalize">
                        {selectedDispute.raisedBy?.role || 'user'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Respondent Party
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                      {selectedDispute.against?.name ? selectedDispute.against.name[0] : 'R'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {selectedDispute.against?.name || 'Respondent'}
                      </span>
                      <span className="text-[11px] text-slate-500 capitalize">
                        {selectedDispute.against?.role || 'user'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disputed Claims & Narrative */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Claim Narrative & Reason for Dispute
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700 leading-relaxed">
                  <div className="font-semibold text-slate-900 text-sm">
                    {selectedDispute.reason}
                  </div>
                  <p className="whitespace-pre-line">{selectedDispute.description}</p>
                </div>
              </div>

              {/* Evidence Locker */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Submitted Evidence Locker ({selectedDispute.evidence?.length || 0})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedDispute.evidence?.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs"
                    >
                      <FileText className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-bold text-slate-900">{ev.title}</h4>
                        <p className="text-slate-500 text-[11px] mt-0.5">{ev.description}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold text-indigo-600 cursor-pointer hover:underline">
                          Inspect Evidence Artifact
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gemini AI Impartial Settlement Assistant */}
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-amber-50 border border-indigo-200 rounded-2xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Gemini AI Impartial Arbitration Assessor</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Evaluates the contract terms, benchmark logs, and communication claims to provide an impartial finding and settlement recommendation.
                    </p>
                  </div>
                  <button
                    onClick={handleRunAIAnalysis}
                    disabled={isAnalyzingAI}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingAI ? 'animate-spin' : ''}`} />
                    <span>{isAnalyzingAI ? 'Arbitrating...' : 'Run Impartial AI Analysis'}</span>
                  </button>
                </div>

                {aiAnalysis && (
                  <div className="pt-3 border-t border-indigo-200/60 space-y-3 animate-in fade-in duration-200">
                    <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 text-xs">
                      <span className="font-bold text-indigo-950 block mb-1">Case Summary:</span>
                      <p className="text-slate-700 leading-relaxed">{aiAnalysis.caseSummary}</p>
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 text-xs">
                      <span className="font-bold text-indigo-950 block mb-1">Key Legal & Technical Findings:</span>
                      <ul className="space-y-1">
                        {aiAnalysis.keyFindings.map((kf, i) => (
                          <li key={i} className="text-slate-700 flex items-start gap-1.5">
                            <span className="text-indigo-600 font-bold">•</span>
                            <span>{kf}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-amber-950 block">
                          AI Recommended Ruling: {aiAnalysis.recommendedOutcome}
                        </span>
                        <p className="text-amber-900 mt-0.5">
                          Rationale: {aiAnalysis.mediationRationale}
                        </p>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[11px] text-amber-800 block">
                          Freelancer: ${aiAnalysis.suggestedFreelancerPayout.toLocaleString()} | Client: ${aiAnalysis.suggestedClientRefund.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin / Mediator Binding Ruling Panel */}
              {selectedDispute.status !== 'resolved' ? (
                <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gavel className="w-5 h-5 text-amber-400" />
                      <h3 className="font-bold text-sm text-white">
                        Admin Binding Arbitration Order
                      </h3>
                    </div>
                    <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                      Mediator Console: Marcus Vance
                    </span>
                  </div>

                  {/* Outcome Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedOutcome('SPLIT_50_50')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedOutcome === 'SPLIT_50_50'
                          ? 'bg-amber-500/20 border-amber-400 text-white font-bold'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="block text-amber-300 font-bold mb-1">50/50 Split Settlement</span>
                      <span className="text-[11px] opacity-80 block">
                        $1,400 to Freelancer
                      </span>
                      <span className="text-[11px] opacity-80 block">
                        $1,400 Refund to Client
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOutcome('RELEASE_TO_FREELANCER')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedOutcome === 'RELEASE_TO_FREELANCER'
                          ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="block text-emerald-300 font-bold mb-1">100% Release to Freelancer</span>
                      <span className="text-[11px] opacity-80 block">
                        ${selectedDispute.amountInDispute.toLocaleString()} Full Payout
                      </span>
                      <span className="text-[11px] opacity-80 block">
                        Deliverable satisfied
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOutcome('REFUND_CLIENT')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedOutcome === 'REFUND_CLIENT'
                          ? 'bg-red-500/20 border-red-400 text-white font-bold'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="block text-red-300 font-bold mb-1">100% Refund to Client</span>
                      <span className="text-[11px] opacity-80 block">
                        ${selectedDispute.amountInDispute.toLocaleString()} Full Refund
                      </span>
                      <span className="text-[11px] opacity-80 block">
                        Unresolved failure
                      </span>
                    </button>
                  </div>

                  {/* Mediator Ruling Statement */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1">
                      Official Mediator Ruling Statement
                    </label>
                    <textarea
                      rows={3}
                      value={mediatorNotes}
                      onChange={(e) => setMediatorNotes(e.target.value)}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white leading-relaxed focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>

                  {/* Submit Ruling */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={handleResolveDispute}
                      disabled={isResolving}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-colors flex items-center gap-2"
                    >
                      <Gavel className="w-4 h-4" />
                      <span>{isResolving ? 'Executing Ruling...' : 'Execute Binding Ruling & Escrow Transfer'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Resolved Stamp Certificate */
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2.5 text-emerald-900 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-base">Official Arbitration Resolution Certificate</span>
                  </div>
                  <div className="text-xs text-emerald-950 space-y-1">
                    <p>
                      <strong>Mediator:</strong> {selectedDispute.mediatorName || 'Marcus Vance'}
                    </p>
                    <p>
                      <strong>Binding Ruling:</strong> {selectedDispute.outcome}
                    </p>
                    <p>
                      <strong>Escrow Apportionment:</strong> Freelancer Payout: $
                      {selectedDispute.freelancerPayout?.toLocaleString() || 0} | Client Refund: $
                      {selectedDispute.clientRefund?.toLocaleString() || 0}
                    </p>
                    <p>
                      <strong>Arbitration Finding:</strong> {selectedDispute.mediatorNotes}
                    </p>
                    <p className="text-[11px] text-emerald-700 pt-1">
                      Resolved on: {new Date(selectedDispute.resolvedAt || '').toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
