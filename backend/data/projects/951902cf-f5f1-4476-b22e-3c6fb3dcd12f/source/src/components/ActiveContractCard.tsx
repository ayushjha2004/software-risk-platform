import React from 'react';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Calendar,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Contract, UserProfile, MilestoneSpec } from '../types';

interface ActiveContractCardProps {
  contract: Contract;
  currentUser: UserProfile;
  onOpenContract: (contractId: string) => void;
}

export const ActiveContractCard: React.FC<ActiveContractCardProps> = ({
  contract,
  currentUser,
  onOpenContract,
}) => {
  const milestones = contract.milestones || [];
  const totalMilestones = milestones.length || 1;
  const approvedMilestones = milestones.filter((m) => m.status === 'approved');
  const submittedMilestones = milestones.filter((m) => m.status === 'submitted');
  const fundedMilestones = milestones.filter((m) => m.status === 'funded');
  const pendingMilestones = milestones.filter((m) => m.status === 'pending_funding');

  const completedCount = approvedMilestones.length;
  const percent = Math.round((completedCount / totalMilestones) * 100);

  // Financial progress
  const releasedAmount = approvedMilestones.reduce((acc, m) => acc + m.amount, 0);
  const fundedInEscrow = contract.escrowFunded;
  const totalValue = contract.totalAmount;
  const financialPercent = Math.min(100, Math.round((releasedAmount / (totalValue || 1)) * 100));

  // Determine current active focal milestone
  const currentActiveMilestone =
    milestones.find((m) => m.status === 'submitted') ||
    milestones.find((m) => m.status === 'funded') ||
    milestones.find((m) => m.status === 'disputed') ||
    milestones.find((m) => m.status === 'pending_funding') ||
    milestones[milestones.length - 1];

  const currentMilestoneIndex = currentActiveMilestone
    ? milestones.findIndex((m) => m.id === currentActiveMilestone.id) + 1
    : 1;

  // Determine progress bar color theme based on completion level
  const getProgressColor = (pct: number) => {
    if (pct === 100) return 'from-emerald-500 to-teal-600 text-emerald-700 bg-emerald-50 border-emerald-200';
    if (pct >= 50) return 'from-indigo-600 to-sky-600 text-indigo-700 bg-indigo-50 border-indigo-200';
    return 'from-sky-500 to-indigo-500 text-sky-700 bg-sky-50 border-sky-200';
  };

  const isClient = currentUser.id === contract.clientId;
  const counterpartyName = isClient ? contract.freelancerName : contract.clientName;
  const counterpartyRole = isClient ? 'Freelancer' : 'Client';

  return (
    <div
      id={`active-contract-${contract.id}`}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-sm hover:border-indigo-200 transition-all space-y-4"
    >
      {/* Top Row: Title, Counterparty & Workspace Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              onClick={() => onOpenContract(contract.id)}
              className="text-sm sm:text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer truncate"
              title={contract.projectTitle}
            >
              {contract.projectTitle}
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Contract
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>
              {counterpartyRole}: <strong className="text-slate-800 font-semibold">{counterpartyName}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Total Budget: <strong className="text-slate-900 font-bold">${totalValue.toLocaleString()}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Escrow: ${fundedInEscrow.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenContract(contract.id)}
          className="self-start sm:self-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <span>Open Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Milestone Progress Bar Section */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
        {/* Progress Header Row: Percentage, Ratio & Released Value */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {percent}%
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Milestones Completed
              </span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                percent === 100
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : percent >= 50
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}
            >
              {completedCount} of {totalMilestones} Approved
            </span>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-500">Released from Escrow: </span>
            <span className="font-bold text-emerald-700">
              ${releasedAmount.toLocaleString()}
            </span>
            <span className="text-slate-400"> / ${totalValue.toLocaleString()}</span>
          </div>
        </div>

        {/* Visual Progress Bar Track */}
        <div className="space-y-1.5">
          {/* Continuous Multi-Segment Visual Bar */}
          <div
            className="w-full bg-slate-200/90 h-3 rounded-full overflow-hidden p-0.5 flex gap-1 shadow-inner"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${contract.projectTitle} milestone progress: ${percent}%`}
          >
            {milestones.map((m, idx) => {
              const isApproved = m.status === 'approved';
              const isSubmitted = m.status === 'submitted';
              const isFunded = m.status === 'funded';
              const isDisputed = m.status === 'disputed';

              let segmentBg = 'bg-slate-300';
              if (isApproved) {
                segmentBg = 'bg-gradient-to-r from-emerald-500 to-teal-500';
              } else if (isSubmitted) {
                segmentBg = 'bg-amber-400 animate-pulse';
              } else if (isFunded) {
                segmentBg = 'bg-sky-500';
              } else if (isDisputed) {
                segmentBg = 'bg-rose-500';
              }

              return (
                <div
                  key={m.id || idx}
                  className={`h-full rounded-full transition-all duration-500 ${segmentBg}`}
                  style={{ flex: 1 }}
                  title={`Milestone ${idx + 1}: ${m.title} (${m.status.replace('_', ' ')}) - $${m.amount}`}
                />
              );
            })}
          </div>

          {/* Micro Legend Underneath Bar */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span className="font-medium text-slate-700">Approved ({completedCount})</span>
              </span>
              {submittedMilestones.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  <span className="font-medium text-slate-700">In Review ({submittedMilestones.length})</span>
                </span>
              )}
              {fundedMilestones.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                  <span className="font-medium text-slate-700">Funded in Escrow ({fundedMilestones.length})</span>
                </span>
              )}
              {pendingMilestones.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                  <span className="font-medium text-slate-600">Pending ({pendingMilestones.length})</span>
                </span>
              )}
            </div>

            <span className="font-semibold text-slate-600">
              {percent === 100 ? 'All Milestones Delivered' : `${totalMilestones - completedCount} Remaining`}
            </span>
          </div>
        </div>

        {/* Milestone Breakdown Step Strip */}
        <div className="pt-2 border-t border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Milestone Stages Breakdown</span>
            {currentActiveMilestone && (
              <span className="text-[10px] lowercase first-letter:uppercase font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Active: Milestone {currentMilestoneIndex} ({currentActiveMilestone.status.replace('_', ' ')})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {milestones.map((m, idx) => {
              const isApproved = m.status === 'approved';
              const isSubmitted = m.status === 'submitted';
              const isFunded = m.status === 'funded';
              const isDisputed = m.status === 'disputed';

              let cardBorder = 'border-slate-200 bg-white';
              let badgeColor = 'bg-slate-100 text-slate-600';
              let statusLabel = 'Upcoming';

              if (isApproved) {
                cardBorder = 'border-emerald-200 bg-emerald-50/40';
                badgeColor = 'bg-emerald-100 text-emerald-800 font-bold';
                statusLabel = 'Approved';
              } else if (isSubmitted) {
                cardBorder = 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-300/60';
                badgeColor = 'bg-amber-100 text-amber-800 font-bold animate-pulse';
                statusLabel = 'Under Review';
              } else if (isFunded) {
                cardBorder = 'border-sky-300 bg-sky-50/40';
                badgeColor = 'bg-sky-100 text-sky-800 font-semibold';
                statusLabel = 'In Progress';
              } else if (isDisputed) {
                cardBorder = 'border-rose-300 bg-rose-50/40';
                badgeColor = 'bg-rose-100 text-rose-800 font-bold';
                statusLabel = 'In Dispute';
              }

              return (
                <div
                  key={m.id || idx}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between gap-1.5 transition-all ${cardBorder}`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-bold text-slate-900 line-clamp-1 text-[11px]" title={m.title}>
                      M{idx + 1}: {m.title}
                    </span>
                    <span className="font-bold text-slate-800 shrink-0 text-[11px]">
                      ${m.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      {isApproved ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : isSubmitted ? (
                        <Clock className="w-3 h-3 text-amber-600" />
                      ) : isFunded ? (
                        <ShieldCheck className="w-3 h-3 text-sky-600" />
                      ) : (
                        <Calendar className="w-3 h-3 text-slate-400" />
                      )}
                      <span>Due {m.dueDate}</span>
                    </span>

                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${badgeColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
