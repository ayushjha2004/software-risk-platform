import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Wallet,
  Briefcase,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  PlusCircle,
  ExternalLink,
  Users,
  Layers,
  Sparkles,
  Filter,
} from 'lucide-react';
import { UserProfile, Contract, NavigationTab } from '../types';
import { api } from '../services/api';
import { INITIAL_CONTRACTS } from '../data/initialData';
import { ActiveContractCard } from './ActiveContractCard';

interface DashboardViewProps {
  currentUser: UserProfile;
  onNavigateTab: (tab: NavigationTab) => void;
  onOpenContract: (contractId: string) => void;
  onOpenPostProject: () => void;
  onSelectUser: (user: UserProfile) => void;
  allUsers: UserProfile[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  onNavigateTab,
  onOpenContract,
  onOpenPostProject,
  onSelectUser,
  allUsers,
}) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState<boolean>(true);
  const [contractFilter, setContractFilter] = useState<'all' | 'active' | 'disputed' | 'completed'>('all');

  useEffect(() => {
    loadUserContracts();
  }, [currentUser.id]);

  const loadUserContracts = async () => {
    setLoadingContracts(true);
    try {
      const data = await api.getContracts();
      const validData = data && data.length > 0 ? data : INITIAL_CONTRACTS;
      const userContracts = validData.filter(
        (c) =>
          currentUser.role === 'admin' ||
          c.clientId === currentUser.id ||
          c.freelancerId === currentUser.id
      );
      setContracts(userContracts);
    } catch (err) {
      console.warn('Failed to load dashboard contracts, using fallback', err);
      const userContracts = INITIAL_CONTRACTS.filter(
        (c) =>
          currentUser.role === 'admin' ||
          c.clientId === currentUser.id ||
          c.freelancerId === currentUser.id
      );
      setContracts(userContracts);
    } finally {
      setLoadingContracts(false);
    }
  };

  const activeContracts = contracts.filter((c) => c.status === 'active');
  const disputedContracts = contracts.filter((c) => c.status === 'disputed');
  const completedContracts = contracts.filter((c) => c.status === 'completed');

  // Overall milestone metrics across all active contracts
  const totalActiveMilestones = activeContracts.reduce(
    (acc, c) => acc + (c.milestones?.length || 0),
    0
  );
  const approvedActiveMilestones = activeContracts.reduce(
    (acc, c) => acc + (c.milestones?.filter((m) => m.status === 'approved').length || 0),
    0
  );
  const activeOverallPercent =
    totalActiveMilestones > 0
      ? Math.round((approvedActiveMilestones / totalActiveMilestones) * 100)
      : 0;

  const filteredContracts =
    contractFilter === 'all'
      ? contracts
      : contracts.filter((c) => c.status === contractFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Persona Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-16 h-16 rounded-2xl object-cover ring-4 ring-slate-100 shadow-xs shrink-0"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {currentUser.name}
                </h1>
                {currentUser.verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified ID & Escrow
                  </span>
                )}
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-900 text-amber-400">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-600">{currentUser.title}</p>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed mt-1">
                {currentUser.bio}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {currentUser.role === 'client' && (
              <button
                onClick={onOpenPostProject}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post New Job</span>
              </button>
            )}

            {currentUser.role === 'freelancer' && (
              <button
                onClick={() => onNavigateTab('explore')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
              >
                <Briefcase className="w-4 h-4" />
                <span>Browse Projects & Bid</span>
              </button>
            )}

            {currentUser.role === 'admin' && (
              <button
                onClick={() => onNavigateTab('disputes')}
                className="bg-slate-900 hover:bg-slate-800 text-amber-400 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors border border-amber-400/30"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Open Mediation Panel</span>
              </button>
            )}

            <button
              onClick={() => onNavigateTab('contracts')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>All Contracts</span>
            </button>
          </div>
        </div>

        {/* Persona Switcher Strip */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-slate-700">Test other perspectives:</span>
            <span>Switch personas to experience client, freelancer, or admin mediation flows:</span>
          </div>

          <div className="flex items-center gap-2">
            {allUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => onSelectUser(u)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  u.id === currentUser.id
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <img
                  src={u.avatar}
                  alt={u.name}
                  className="w-4 h-4 rounded-full object-cover"
                />
                <span>{u.name.split(' ')[0]}</span>
                <span className="text-[10px] opacity-75 capitalize">({u.role})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Escrow Status Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {currentUser.role === 'admin' ? 'Escrow Under Oversight' : 'Escrow Protected'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              ${(currentUser.escrowBalance || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Secured in segregated vault
            </p>
          </div>
        </div>

        {/* Financial Flow Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {currentUser.role === 'client' ? 'Total Project Spend' : currentUser.role === 'freelancer' ? 'Total Earnings' : 'Resolved Payouts'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              ${(currentUser.totalSpent || currentUser.totalEarned || 142000).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Across all delivered milestones
            </p>
          </div>
        </div>

        {/* Active Contracts Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Contracts
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {activeContracts.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {disputedContracts.length > 0
                ? `${disputedContracts.length} in dispute review`
                : '100% on-track delivery'}
            </p>
          </div>
        </div>

        {/* Platform Trust & Reputation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Trust & Reputation
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-1.5">
              ★ {currentUser.rating ? currentUser.rating.toFixed(1) : '5.0'}
              <span className="text-xs font-normal text-slate-500">
                ({currentUser.completedJobs} jobs)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Member since {currentUser.memberSince}
            </p>
          </div>
        </div>
      </div>

      {/* ================= SECTION: ACTIVE CONTRACTS MILESTONE PROGRESS TRACKER ================= */}
      <div id="active-contracts-progress-section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Active Project Contracts Tracker
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {activeContracts.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live visual progress bars indicating milestone completion percentages and deliverable stages at a glance
            </p>
          </div>

          {activeContracts.length > 0 && (
            <div className="flex items-center gap-3 bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs shadow-2xs self-start sm:self-auto">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Active Completion Rate:
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {activeOverallPercent}%
                </span>
              </div>
              <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${activeOverallPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                ({approvedActiveMilestones}/{totalActiveMilestones} Milestones)
              </span>
            </div>
          )}
        </div>

        {loadingContracts ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-xs">
            Loading active contract records...
          </div>
        ) : activeContracts.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
            <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No active contracts in progress for this profile.</p>
            <p className="text-[11px] text-slate-500 mt-1 mb-3">
              Accept a proposal or initiate milestone escrow to track live progress bars here.
            </p>
            <button
              onClick={() => onNavigateTab('explore')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Browse Open Projects
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {activeContracts.map((contract) => (
              <ActiveContractCard
                key={contract.id}
                contract={contract}
                currentUser={currentUser}
                onOpenContract={onOpenContract}
              />
            ))}
          </div>
        )}
      </div>

      {/* ================= SECTION: ALL CONTRACTS & ESCROW RECORDS ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {currentUser.role === 'admin' ? 'All Platform Contracts & Escrow Records' : 'All Contracts & Escrow History'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review milestone completion, dispute statuses, and contract archives
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setContractFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  contractFilter === 'all'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({contracts.length})
              </button>
              <button
                type="button"
                onClick={() => setContractFilter('active')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  contractFilter === 'active'
                    ? 'bg-white text-emerald-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({activeContracts.length})
              </button>
              {disputedContracts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setContractFilter('disputed')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    contractFilter === 'disputed'
                      ? 'bg-white text-amber-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Disputed ({disputedContracts.length})
                </button>
              )}
              {completedContracts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setContractFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    contractFilter === 'completed'
                      ? 'bg-white text-indigo-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Completed ({completedContracts.length})
                </button>
              )}
            </div>

            <button
              onClick={() => onNavigateTab('contracts')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0 ml-2"
            >
              <span>Contracts Tab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loadingContracts ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading contract records...
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
            <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No {contractFilter !== 'all' ? contractFilter : ''} contracts found.</p>
            <p className="text-[11px] text-slate-500 mt-1 mb-3">
              Explore open listings or accept a proposal to initiate milestone escrow.
            </p>
            <button
              onClick={() => onNavigateTab('explore')}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
            >
              Browse Open Listings
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContracts.slice(0, 6).map((c) => {
              const totalMilestones = c.milestones?.length || 1;
              const approvedMilestones = c.milestones?.filter((m) => m.status === 'approved').length || 0;
              const percent = Math.round((approvedMilestones / totalMilestones) * 100);

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {c.projectTitle}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          c.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.status === 'disputed'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>Client: <strong className="text-slate-700 font-semibold">{c.clientName}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>Freelancer: <strong className="text-slate-700 font-semibold">{c.freelancerName}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>Total: <strong className="text-slate-900 font-bold">${c.totalAmount.toLocaleString()}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>In Escrow: <strong className="text-amber-600 font-semibold">${c.escrowFunded.toLocaleString()}</strong></span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full max-w-lg space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span>Milestone Progress</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              percent === 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : percent >= 50
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {percent}%
                          </span>
                        </span>
                        <span className="text-slate-500 font-medium">
                          {approvedMilestones} of {totalMilestones} Milestones Approved
                        </span>
                      </div>

                      {/* Multi-segment styled bar */}
                      <div
                        className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex gap-0.5 p-0.5 shadow-inner"
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        {c.milestones && c.milestones.length > 0 ? (
                          c.milestones.map((m, idx) => {
                            let segBg = 'bg-slate-300';
                            if (m.status === 'approved') segBg = 'bg-emerald-500';
                            else if (m.status === 'submitted') segBg = 'bg-amber-400';
                            else if (m.status === 'funded') segBg = 'bg-sky-500';
                            else if (m.status === 'disputed') segBg = 'bg-rose-500';

                            return (
                              <div
                                key={m.id || idx}
                                className={`h-full rounded-full transition-all duration-300 ${segBg}`}
                                style={{ flex: 1 }}
                                title={`Milestone ${idx + 1}: ${m.title} (${m.status})`}
                              />
                            );
                          })
                        ) : (
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => onOpenContract(c.id)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trust & Escrow Guarantee Guarantee Info Box */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Bid Forge Trust & Safe-Escrow Protocol
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Client funds are held in verifiable escrow until deliverables meet objective milestones. 
                Disputes are settled via neutral binding mediator rulings within 48 hours.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('disputes')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold whitespace-nowrap transition-colors"
          >
            Review Mediation SLA
          </button>
        </div>
      </div>
    </div>
  );
};
