import React from 'react';
import {
  Briefcase,
  ShieldCheck,
  PlusCircle,
  FileText,
  AlertTriangle,
  User,
  CheckCircle2,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { UserProfile, Role, NavigationTab } from '../types';
import { DEFAULT_USER, INITIAL_USERS_LIST } from '../data/initialData';

interface NavbarProps {
  currentUser?: UserProfile;
  allUsers?: UserProfile[];
  onSelectUser?: (user: UserProfile) => void;
  onUserChange?: (user: UserProfile) => void;
  activeTab?: NavigationTab;
  setActiveTab?: (tab: NavigationTab) => void;
  onTabChange?: (tab: NavigationTab) => void;
  onOpenPostModal?: () => void;
  onOpenPostProject?: () => void;
  activeDisputeCount?: number;
  activeContractCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  onUserChange,
  activeTab = 'explore',
  setActiveTab,
  onTabChange,
  onOpenPostModal,
  onOpenPostProject,
  activeDisputeCount = 0,
  activeContractCount = 0,
}) => {
  const safeUser: UserProfile = currentUser || DEFAULT_USER;
  const userList: UserProfile[] = (allUsers && allUsers.length > 0) ? allUsers : INITIAL_USERS_LIST;

  const handleSelectUser = (u: UserProfile) => {
    if (onSelectUser) onSelectUser(u);
    if (onUserChange) onUserChange(u);
  };

  const handleTabChange = (tab: NavigationTab) => {
    if (setActiveTab) setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const handleOpenPost = () => {
    if (onOpenPostModal) onOpenPostModal();
    if (onOpenPostProject) onOpenPostProject();
  };

  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case 'client':
        return {
          label: 'Client',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          desc: 'Alex Rivera (Tech Founder)',
        };
      case 'freelancer':
        return {
          label: 'Freelancer',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          desc: 'Elena Rostova (Principal Dev)',
        };
      case 'admin':
        return {
          label: 'Admin Mediator',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          desc: 'Marcus Vance (Chief Arbiter)',
        };
      default:
        return {
          label: 'Platform User',
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          desc: 'Member',
        };
    }
  };

  const roleInfo = getRoleBadge(safeUser.role);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner / Role Switcher Strip */}
      <div className="bg-slate-900 text-slate-200 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-300">Live Simulation Mode:</span>
          <span className="text-slate-400">Switch roles to test bidding, escrow funding, milestone submissions, and admin dispute arbitration.</span>
        </div>

        {/* Quick Role Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 mr-1 hidden sm:inline">Active Persona:</span>
          {userList.map((u) => {
            const isSelected = u.id === safeUser.id;
            return (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title={`Switch to ${u.name} (${u.role})`}
              >
                <img
                  src={u.avatar}
                  alt={u.name}
                  className="w-3.5 h-3.5 rounded-full object-cover"
                />
                <span>{u.name.split(' ')[0]}</span>
                <span className="opacity-75 uppercase text-[10px]">({u.role})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => handleTabChange('explore')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center text-amber-400 shadow-sm group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold tracking-tight text-slate-900">
                    BID<span className="text-amber-600">FORGE</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Escrow & Bidding
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-none">
                  Transparent Freelance Contracts
                </p>
              </div>
            </button>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => handleTabChange('explore')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'explore'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-4 h-4 text-slate-500" />
                Browse Projects
              </button>

              <button
                onClick={() => handleTabChange('contracts')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 relative ${
                  activeTab === 'contracts'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4 text-slate-500" />
                Contracts & Escrow
                {activeContractCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                    {activeContractCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleTabChange('disputes')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 relative ${
                  activeTab === 'disputes'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Dispute Mediation
                {activeDisputeCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    {activeDisputeCount} Active
                  </span>
                )}
              </button>

              <button
                onClick={() => handleTabChange('dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Wallet className="w-4 h-4 text-slate-500" />
                My Dashboard
              </button>
            </nav>
          </div>

          {/* Action Buttons & Profile */}
          <div className="flex items-center gap-3">
            {safeUser.role === 'client' && (
              <button
                onClick={handleOpenPost}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post a Project</span>
              </button>
            )}

            {safeUser.role === 'freelancer' && (
              <button
                onClick={() => handleTabChange('explore')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Find Jobs & Bid</span>
              </button>
            )}

            {safeUser.role === 'admin' && (
              <button
                onClick={() => handleTabChange('disputes')}
                className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Mediator Portal</span>
              </button>
            )}

            {/* Profile Dropdown / Pill */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <img
                src={safeUser.avatar}
                alt={safeUser.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100"
              />
              <div className="hidden lg:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-900 leading-tight">
                    {safeUser.name}
                  </span>
                  {safeUser.verified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${roleInfo.bg}`}
                  >
                    {roleInfo.label}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ★ {safeUser.rating ? safeUser.rating.toFixed(1) : '5.0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 overflow-x-auto text-xs">
          <button
            onClick={() => handleTabChange('explore')}
            className={`px-2.5 py-1.5 rounded font-medium ${
              activeTab === 'explore' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600'
            }`}
          >
            Explore
          </button>
          <button
            onClick={() => handleTabChange('contracts')}
            className={`px-2.5 py-1.5 rounded font-medium ${
              activeTab === 'contracts' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600'
            }`}
          >
            Contracts ({activeContractCount})
          </button>
          <button
            onClick={() => handleTabChange('disputes')}
            className={`px-2.5 py-1.5 rounded font-medium ${
              activeTab === 'disputes' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600'
            }`}
          >
            Disputes ({activeDisputeCount})
          </button>
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`px-2.5 py-1.5 rounded font-medium ${
              activeTab === 'dashboard' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600'
            }`}
          >
            Dashboard
          </button>
        </div>
      </div>
    </header>
  );
};
