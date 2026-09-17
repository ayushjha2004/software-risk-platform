import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { Contract, UserProfile } from '../types';
import { api } from '../services/api';
import { INITIAL_CONTRACTS } from '../data/initialData';

interface ContractsListProps {
  currentUser: UserProfile;
  onSelectContract: (contractId: string) => void;
  onSelectDispute: (disputeId: string) => void;
}

export const ContractsList: React.FC<ContractsListProps> = ({
  currentUser,
  onSelectContract,
  onSelectDispute,
}) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disputed' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const data = await api.getContracts();
      if (data && data.length > 0) {
        setContracts(data);
      } else {
        setContracts(INITIAL_CONTRACTS);
      }
    } catch (err) {
      console.warn('Failed to load contracts, using initial data', err);
      setContracts(INITIAL_CONTRACTS);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch =
      c.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.freelancerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Contract & Escrow Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking of active milestone commitments, escrow deposits, and collaborative deliverables.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
            {(['all', 'active', 'disputed', 'completed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                  statusFilter === st ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading active contracts...</p>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No contracts found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search criteria or explore open jobs in the marketplace.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContracts.map((contract) => {
            const completedMilestones = contract.milestones.filter(
              (m) => m.status === 'approved'
            ).length;
            const progressPercent = Math.round(
              (completedMilestones / contract.milestones.length) * 100
            );

            return (
              <div
                key={contract.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-slate-400">
                      Contract #{contract.id}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        contract.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : contract.status === 'disputed'
                          ? 'bg-amber-50 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {contract.status === 'disputed' ? 'In Dispute' : contract.status}
                    </span>
                  </div>

                  {/* Project Title */}
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1 mb-2">
                    {contract.projectTitle}
                  </h3>

                  {/* Parties */}
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Client
                      </span>
                      <span className="font-bold text-slate-800">{contract.clientName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Freelancer
                      </span>
                      <span className="font-bold text-slate-800">{contract.freelancerName}</span>
                    </div>
                  </div>

                  {/* Milestone Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        Milestone Progress ({completedMilestones}/{contract.milestones.length})
                      </span>
                      <span className="font-bold text-slate-900">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Financials Bento */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                      <span className="text-[10px] text-indigo-700 block">Escrow Funded</span>
                      <span className="font-bold text-indigo-950 text-sm">
                        ${contract.escrowFunded.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                      <span className="text-[10px] text-emerald-700 block">Released</span>
                      <span className="font-bold text-emerald-950 text-sm">
                        ${contract.escrowReleased.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    Total: <strong className="text-slate-700">${contract.totalAmount.toLocaleString()}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {contract.disputeId && (
                      <button
                        onClick={() => onSelectDispute(contract.disputeId!)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200"
                        title="View Dispute Mediation"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onSelectContract(contract.id)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
