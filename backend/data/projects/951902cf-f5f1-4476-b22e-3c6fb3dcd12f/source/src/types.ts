export type Role = 'client' | 'freelancer' | 'admin';

export type NavigationTab = 'explore' | 'contracts' | 'workspace' | 'disputes' | 'dashboard';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  title: string;
  rating: number;
  completedJobs: number;
  totalEarned?: number;
  totalSpent?: number;
  escrowBalance: number;
  skills: string[];
  bio: string;
  verified: boolean;
  memberSince: string;
}

export type BudgetType = 'fixed' | 'hourly' | 'milestone';
export type ProjectStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
export type ExperienceLevel = 'entry' | 'intermediate' | 'expert';

export interface MilestoneSpec {
  id: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'pending_funding' | 'funded' | 'submitted' | 'approved' | 'revision_requested' | 'disputed';
  deliverableNotes?: string;
  deliverableFiles?: string[];
  submissionDate?: string;
  approvedDate?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  clientId: string;
  clientName: string;
  clientCompany?: string;
  clientRating: number;
  clientLocation: string;
  budgetType: BudgetType;
  budgetMin: number;
  budgetMax: number;
  experienceLevel: ExperienceLevel;
  duration: string;
  skills: string[];
  status: ProjectStatus;
  bidsCount: number;
  avgBidAmount: number;
  createdAt: string;
  deadline: string;
  contractId?: string;
  awardedFreelancerId?: string;
  initialMilestones: MilestoneSpec[];
}

export interface BidMilestoneProposal {
  title: string;
  amount: number;
  deliveryDays: number;
}

export interface Bid {
  id: string;
  projectId: string;
  projectTitle: string;
  freelancerId: string;
  freelancerName: string;
  freelancerAvatar: string;
  freelancerTitle: string;
  freelancerRating: number;
  freelancerCompletedJobs: number;
  bidAmount: number;
  estimatedDeliveryDays: number;
  coverLetter: string;
  proposedMilestones: BidMilestoneProposal[];
  portfolioLinks: string[];
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
}

export type ContractStatus = 'active' | 'completed' | 'disputed' | 'cancelled';

export interface Contract {
  id: string;
  projectId: string;
  projectTitle: string;
  clientId: string;
  clientName: string;
  freelancerId: string;
  freelancerName: string;
  totalAmount: number;
  escrowFunded: number;
  escrowReleased: number;
  status: ContractStatus;
  startDate: string;
  completionDate?: string;
  milestones: MilestoneSpec[];
  disputeId?: string;
}

export interface Message {
  id: string;
  contractId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  text: string;
  timestamp: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentSize?: string;
}

export interface DocumentItem {
  id: string;
  contractId: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploaderRole: Role;
  uploadedAt: string;
  milestoneId?: string;
  url: string;
  status: 'draft' | 'submitted' | 'approved';
}

export type DisputeStatus = 'open' | 'under_review' | 'resolved';
export type DisputeResolutionOutcome = 'RELEASE_TO_FREELANCER' | 'REFUND_CLIENT' | 'SPLIT_50_50' | 'CUSTOM_SPLIT';

export interface Dispute {
  id: string;
  contractId: string;
  projectTitle: string;
  milestoneId?: string;
  milestoneTitle?: string;
  amountInDispute: number;
  raisedBy: {
    id: string;
    name: string;
    role: Role;
  };
  against: {
    id: string;
    name: string;
    role: Role;
  };
  reason: string;
  description: string;
  evidence: {
    title: string;
    description: string;
    fileUrl?: string;
  }[];
  status: DisputeStatus;
  createdAt: string;
  resolvedAt?: string;
  outcome?: DisputeResolutionOutcome;
  freelancerPayout?: number;
  clientRefund?: number;
  mediatorNotes?: string;
  mediatorName?: string;
}
