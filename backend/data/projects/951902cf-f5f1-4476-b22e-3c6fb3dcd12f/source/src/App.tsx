import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Layers,
  ShieldCheck,
  Briefcase,
  Users,
  Plus,
  RefreshCw,
  Sparkles,
  Award,
  CheckCircle,
  SlidersHorizontal,
  ChevronDown,
  Bookmark,
} from 'lucide-react';
import { Project, UserProfile, NavigationTab } from './types';
import {
  INITIAL_USERS,
  DEFAULT_USER,
  INITIAL_USERS_LIST,
  INITIAL_PROJECTS,
  INITIAL_CONTRACTS,
  INITIAL_DISPUTES,
} from './data/initialData';
import { api } from './services/api';
import { useSavedProjects } from './utils/savedProjects';
import { Navbar } from './components/Navbar';
import { ProjectCard } from './components/ProjectCard';
import { ProjectDetailsModal } from './components/ProjectDetailsModal';
import { PostProjectModal } from './components/PostProjectModal';
import { ContractWorkspace } from './components/ContractWorkspace';
import { DisputeMediationCenter } from './components/DisputeMediationCenter';
import { ContractsList } from './components/ContractsList';
import { DashboardView } from './components/DashboardView';

export default function App() {
  // Active Persona State
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_USER);
  const [activeTab, setActiveTab] = useState<NavigationTab>('explore');
  const [activeContractCount, setActiveContractCount] = useState<number>(0);
  const [activeDisputeCount, setActiveDisputeCount] = useState<number>(0);

  // Marketplace Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBudgetType, setSelectedBudgetType] = useState<string>('all');
  const [selectedExperience, setSelectedExperience] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'budget_high' | 'bids_count'>('newest');
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);

  // Persistent Saved Projects Hook
  const { savedProjectIds, isSaved, toggle: toggleSavedProject, savedCount } = useSavedProjects();

  // Selected Items / Navigation States
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectDetailsOpen, setIsProjectDetailsOpen] = useState<boolean>(false);
  const [isPostProjectOpen, setIsPostProjectOpen] = useState<boolean>(false);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [activeDisputeId, setActiveDisputeId] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadProjects();
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      const [contractsData, disputesData] = await Promise.allSettled([
        api.getContracts(),
        api.getDisputes(),
      ]);
      if (contractsData.status === 'fulfilled' && Array.isArray(contractsData.value)) {
        const active = contractsData.value.filter((c) => c.status === 'active').length;
        setActiveContractCount(active);
      } else {
        setActiveContractCount(INITIAL_CONTRACTS.filter((c) => c.status === 'active').length);
      }
      if (disputesData.status === 'fulfilled' && Array.isArray(disputesData.value)) {
        const active = disputesData.value.filter((d) => d.status === 'open' || d.status === 'under_review').length;
        setActiveDisputeCount(active);
      } else {
        setActiveDisputeCount(INITIAL_DISPUTES.filter((d) => d.status === 'open' || d.status === 'under_review').length);
      }
    } catch (err) {
      console.warn('Failed to load counts, using fallback', err);
      setActiveContractCount(INITIAL_CONTRACTS.filter((c) => c.status === 'active').length);
      setActiveDisputeCount(INITIAL_DISPUTES.filter((d) => d.status === 'open' || d.status === 'under_review').length);
    }
  };

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await api.getProjects();
      const finalProjects = data && data.length > 0 ? data : INITIAL_PROJECTS;
      setProjects(finalProjects);

      // Restore active project details modal if user refreshed page while drafting
      try {
        const savedActiveProjId = localStorage.getItem('bid_forge_active_project_id');
        if (savedActiveProjId) {
          const match = finalProjects.find((p) => p.id === savedActiveProjId);
          if (match) {
            setSelectedProject(match);
            setIsProjectDetailsOpen(true);
          }
        }
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.warn('Failed to load projects from network, using initial dataset', err);
      setProjects(INITIAL_PROJECTS);
      try {
        const savedActiveProjId = localStorage.getItem('bid_forge_active_project_id');
        if (savedActiveProjId) {
          const match = INITIAL_PROJECTS.find((p) => p.id === savedActiveProjId);
          if (match) {
            setSelectedProject(match);
            setIsProjectDetailsOpen(true);
          }
        }
      } catch (e) {
        // ignore
      }
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setIsProjectDetailsOpen(true);
    try {
      localStorage.setItem('bid_forge_active_project_id', project.id);
    } catch (e) {
      // ignore
    }
  };

  const handleNavigateToContract = (contractId: string) => {
    setIsProjectDetailsOpen(false);
    setSelectedProject(null);
    try {
      localStorage.removeItem('bid_forge_active_project_id');
      localStorage.removeItem('bid_forge_active_bid_project_id');
    } catch (e) {
      // ignore
    }
    setActiveContractId(contractId);
    setActiveTab('workspace');
  };

  const handleNavigateToDispute = (disputeId?: string) => {
    setIsProjectDetailsOpen(false);
    setSelectedProject(null);
    try {
      localStorage.removeItem('bid_forge_active_project_id');
      localStorage.removeItem('bid_forge_active_bid_project_id');
    } catch (e) {
      // ignore
    }
    setActiveDisputeId(disputeId);
    setActiveTab('disputes');
  };

  // Categories list
  const categories = [
    'All',
    'Full Stack Development',
    'Backend & FinTech',
    'Security & DevOps',
    'DevOps & Cloud',
    'AI & Machine Learning',
  ];

  // Filtering & Sorting
  const filteredProjects = projects.filter((project) => {
    // If user activated 'Saved Only' filter, restrict to bookmarked items
    if (showSavedOnly && !savedProjectIds.includes(project.id)) {
      return false;
    }

    const matchesSearch =
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' || project.category === selectedCategory;

    const matchesBudgetType =
      selectedBudgetType === 'all' || project.budgetType === selectedBudgetType;

    const matchesExperience =
      selectedExperience === 'all' || project.experienceLevel === selectedExperience;

    return matchesSearch && matchesCategory && matchesBudgetType && matchesExperience;
  }).sort((a, b) => {
    if (sortBy === 'budget_high') return b.budgetMax - a.budgetMax;
    if (sortBy === 'bids_count') return b.bidsCount - a.bidsCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        allUsers={INITIAL_USERS_LIST}
        onUserChange={setCurrentUser}
        onSelectUser={setCurrentUser}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'workspace') {
            setActiveContractId(null);
          }
        }}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'workspace') {
            setActiveContractId(null);
          }
        }}
        onOpenPostProject={() => setIsPostProjectOpen(true)}
        onOpenPostModal={() => setIsPostProjectOpen(true)}
        activeContractCount={activeContractCount}
        activeDisputeCount={activeDisputeCount}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* ================= VIEW 1: MARKETPLACE & EXPLORE ================= */}
        {activeTab === 'explore' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Value Proposition Metrics Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/20">
                    Transparent Job Bidding & Guaranteed Escrow
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Bid Forge Enterprise Freelance Marketplace
                </h1>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Connect verified clients and top-tier developers with customizable listings, automated milestone escrow funding, real-time collaboration, and neutral admin mediation.
                </p>
              </div>

              {/* Trust Metric Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0 text-xs">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">Total In Escrow</span>
                  <span className="text-base font-bold text-amber-400">$184,500</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3" /> 100% Protected
                  </span>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">Milestone Completion</span>
                  <span className="text-base font-bold text-white">98.2%</span>
                  <span className="text-[10px] text-slate-300 mt-0.5 block">
                    Zero payment delay
                  </span>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-slate-400 block">Mediation SLA</span>
                  <span className="text-base font-bold text-white">&lt; 48 Hrs</span>
                  <span className="text-[10px] text-indigo-300 mt-0.5 block">
                    Neutral binding ruling
                  </span>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by job title, skill tags (e.g. Spring Boot, React, Kafka), or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-hidden transition-all"
                  />
                </div>

                {/* Filters Dropdowns */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={selectedBudgetType}
                    onChange={(e) => setSelectedBudgetType(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="all">All Contract Types</option>
                    <option value="milestone">Milestone Escrow</option>
                    <option value="fixed">Fixed Price</option>
                    <option value="hourly">Hourly Contract</option>
                  </select>

                  <select
                    value={selectedExperience}
                    onChange={(e) => setSelectedExperience(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="all">All Experience Levels</option>
                    <option value="expert">Expert</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="entry">Entry Level</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="budget_high">Sort: Highest Budget</option>
                    <option value="bids_count">Sort: Most Proposals</option>
                  </select>

                  {/* Saved / Bookmarked Projects Quick Filter Button */}
                  <button
                    type="button"
                    id="filter-saved-projects-btn"
                    onClick={() => setShowSavedOnly((prev) => !prev)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 cursor-pointer ${
                      showSavedOnly
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-2 ring-amber-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/60 hover:text-amber-900'
                    }`}
                    title={showSavedOnly ? 'Showing saved projects only - click to show all' : 'Filter by saved projects'}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        showSavedOnly ? 'fill-slate-950 text-slate-950 scale-110' : 'text-amber-600'
                      }`}
                    />
                    <span>Saved ({savedCount})</span>
                  </button>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setShowSavedOnly(false);
                    }}
                    className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat && !showSavedOnly
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}

                {/* Saved List Category Pill */}
                <button
                  type="button"
                  id="category-pill-saved"
                  onClick={() => setShowSavedOnly(true)}
                  className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    showSavedOnly
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'bg-amber-50/80 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
                  }`}
                >
                  <Bookmark
                    className={`w-3 h-3 ${
                      showSavedOnly ? 'fill-slate-950 text-slate-950' : 'text-amber-600'
                    }`}
                  />
                  <span>Saved List ({savedCount})</span>
                </button>
              </div>
            </div>

            {/* Projects Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {showSavedOnly ? 'Saved / Bookmarked Projects' : 'Open Project Listings'} ({filteredProjects.length})
                  </span>
                  {showSavedOnly && (
                    <button
                      onClick={() => setShowSavedOnly(false)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 underline normal-case cursor-pointer"
                    >
                      Show all projects
                    </button>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  Click any project to review specs, compare milestone breakdowns, or bid
                </span>
              </div>

              {loadingProjects ? (
                <div className="py-20 text-center">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Loading verified projects...</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                showSavedOnly ? (
                  <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
                    <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3">
                      <Bookmark className="w-6 h-6 text-amber-500 fill-amber-100" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">No bookmarked projects found</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4 max-w-md mx-auto leading-relaxed">
                      You haven't bookmarked any projects yet, or none match your current search criteria. Click the bookmark icon on any project card to save it to your list. State automatically persists across page refreshes.
                    </p>
                    <button
                      onClick={() => {
                        setShowSavedOnly(false);
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Browse All Projects
                    </button>
                  </div>
                ) : (
                  <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
                    <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800">No projects match your filter</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Clear your search keywords or switch category filter to see available listings.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                        setSelectedBudgetType('all');
                        setSelectedExperience('all');
                      }}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onSelectProject={handleSelectProject}
                      currentUser={currentUser}
                      isBookmarked={isSaved(project.id)}
                      onToggleBookmark={(projId) => toggleSavedProject(projId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW 2: CONTRACTS LIST ================= */}
        {activeTab === 'contracts' && (
          <ContractsList
            currentUser={currentUser}
            onSelectContract={(cId) => {
              setActiveContractId(cId);
              setActiveTab('workspace');
            }}
            onSelectDispute={(dId) => {
              setActiveDisputeId(dId);
              setActiveTab('disputes');
            }}
          />
        )}

        {/* ================= VIEW 3: INTERACTIVE CONTRACT WORKSPACE ================= */}
        {activeTab === 'workspace' && activeContractId && (
          <ContractWorkspace
            contractId={activeContractId}
            currentUser={currentUser}
            onNavigateToDispute={(dId) => {
              setActiveDisputeId(dId);
              setActiveTab('disputes');
            }}
            onBackToExplore={() => setActiveTab('explore')}
          />
        )}

        {/* ================= VIEW 4: DISPUTE MEDIATION CENTER ================= */}
        {activeTab === 'disputes' && (
          <DisputeMediationCenter
            currentUser={currentUser}
            initialDisputeId={activeDisputeId}
            onNavigateToContract={(cId) => {
              setActiveContractId(cId);
              setActiveTab('workspace');
            }}
          />
        )}

        {/* ================= VIEW 5: USER DASHBOARD ================= */}
        {activeTab === 'dashboard' && (
          <DashboardView
            currentUser={currentUser}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              if (tab !== 'workspace') {
                setActiveContractId(null);
              }
            }}
            onOpenContract={(cId) => {
              setActiveContractId(cId);
              setActiveTab('workspace');
            }}
            onOpenPostProject={() => setIsPostProjectOpen(true)}
            onSelectUser={setCurrentUser}
            allUsers={INITIAL_USERS_LIST}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">Bid Forge</span>
            <span>— Secured Freelancer Job Bidding & Milestone Escrow Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Escrow Protection Active
            </span>
            <span>Admin Mediation Guaranteed</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isProjectDetailsOpen && selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          currentUser={currentUser}
          isOpen={isProjectDetailsOpen}
          onClose={() => {
            setIsProjectDetailsOpen(false);
            setSelectedProject(null);
            try {
              localStorage.removeItem('bid_forge_active_project_id');
              localStorage.removeItem('bid_forge_active_bid_project_id');
            } catch (e) {
              // ignore
            }
          }}
          onNavigateToContract={handleNavigateToContract}
          onRefreshProjects={loadProjects}
        />
      )}

      {isPostProjectOpen && (
        <PostProjectModal
          currentUser={currentUser}
          isOpen={isPostProjectOpen}
          onClose={() => setIsPostProjectOpen(false)}
          onProjectCreated={loadProjects}
        />
      )}
    </div>
  );
}
