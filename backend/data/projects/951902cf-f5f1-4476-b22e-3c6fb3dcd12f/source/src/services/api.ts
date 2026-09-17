import {
  Project,
  Bid,
  Contract,
  Dispute,
  Message,
  DocumentItem,
  UserProfile,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_USERS_LIST,
  INITIAL_PROJECTS,
  INITIAL_BIDS,
  INITIAL_CONTRACTS,
  INITIAL_DISPUTES,
  INITIAL_MESSAGES,
  INITIAL_DOCUMENTS,
} from '../data/initialData';

// Local resilient fallback storage
const localState = {
  users: { ...INITIAL_USERS },
  projects: [...INITIAL_PROJECTS],
  bids: [...INITIAL_BIDS],
  contracts: [...INITIAL_CONTRACTS],
  disputes: [...INITIAL_DISPUTES],
  messages: { ...INITIAL_MESSAGES },
  documents: { ...INITIAL_DOCUMENTS },
};

// Resilient fetch wrapper with retry and graceful fallback
async function resilientFetch<T>(
  url: string,
  options?: RequestInit,
  fallbackFn?: () => T | Promise<T>,
  retries = 1
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        return (await res.json()) as T;
      }
      // If server returned non-200 and we have a fallback, use it
      if (fallbackFn) {
        console.warn(`[API] Server returned ${res.status} for ${url}, using local fallback.`);
        return await fallbackFn();
      }
      throw new Error(`Server returned status ${res.status}`);
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        // Brief exponential backoff before retry
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
  }

  // Network error / Failed to fetch
  if (fallbackFn) {
    console.warn(`[API] Network request failed for ${url} (${lastError?.message}), using local fallback.`);
    return await fallbackFn();
  }

  throw lastError || new Error(`Network failure requesting ${url}`);
}

export const api = {
  async getUsers(): Promise<UserProfile[]> {
    return resilientFetch<UserProfile[]>(
      '/api/users',
      undefined,
      () => Object.values(localState.users)
    );
  },

  async getUser(id: string): Promise<UserProfile> {
    return resilientFetch<UserProfile>(
      `/api/users/${id}`,
      undefined,
      () => localState.users[id] || INITIAL_USERS_LIST[0]
    );
  },

  async getProjects(params?: {
    category?: string;
    search?: string;
    status?: string;
    minBudget?: number;
    maxBudget?: number;
  }): Promise<Project[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.minBudget) query.append('minBudget', String(params.minBudget));
    if (params?.maxBudget) query.append('maxBudget', String(params.maxBudget));

    return resilientFetch<Project[]>(
      `/api/projects?${query.toString()}`,
      undefined,
      () => {
        let result = [...localState.projects];
        if (params?.category && params.category !== 'All') {
          result = result.filter(
            (p) => p.category.toLowerCase() === params.category!.toLowerCase()
          );
        }
        if (params?.status && params.status !== 'All') {
          result = result.filter((p) => p.status === params.status);
        }
        if (params?.search) {
          const q = params.search.toLowerCase();
          result = result.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q) ||
              p.skills.some((s) => s.toLowerCase().includes(q))
          );
        }
        if (params?.minBudget) {
          result = result.filter((p) => p.budgetMax >= params.minBudget!);
        }
        if (params?.maxBudget) {
          result = result.filter((p) => p.budgetMin <= params.maxBudget!);
        }
        return result;
      }
    );
  },

  async getProject(id: string): Promise<Project & { bids: Bid[]; contract?: Contract }> {
    return resilientFetch<Project & { bids: Bid[]; contract?: Contract }>(
      `/api/projects/${id}`,
      undefined,
      () => {
        const project = localState.projects.find((p) => p.id === id) || localState.projects[0];
        const projectBids = localState.bids.filter((b) => b.projectId === project.id);
        const contract = localState.contracts.find((c) => c.projectId === project.id);
        return { ...project, bids: projectBids, contract };
      }
    );
  },

  async createProject(projectData: Partial<Project>): Promise<Project> {
    return resilientFetch<Project>(
      '/api/projects',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      },
      () => {
        const newProject: Project = {
          id: `proj-${Date.now()}`,
          title: projectData.title || 'Untitled Project',
          description: projectData.description || '',
          category: projectData.category || 'Full Stack Development',
          clientId: projectData.clientId || 'user-client-1',
          clientName: projectData.clientName || 'Alex Rivera',
          clientCompany: 'Apex Systems',
          clientRating: 4.95,
          clientLocation: 'Remote',
          budgetType: projectData.budgetType || 'milestone',
          budgetMin: Number(projectData.budgetMin || 1000),
          budgetMax: Number(projectData.budgetMax || 2500),
          experienceLevel: projectData.experienceLevel || 'expert',
          duration: projectData.duration || '2-4 weeks',
          skills: projectData.skills || ['React', 'TypeScript'],
          status: 'open',
          bidsCount: 0,
          avgBidAmount: 0,
          createdAt: new Date().toISOString(),
          deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
          initialMilestones: projectData.initialMilestones || [
            {
              id: `m-${Date.now()}-1`,
              title: 'Phase 1: Architecture & Foundations',
              description: 'Initial requirements spec, schema models, and base scaffolding',
              amount: Math.round(Number(projectData.budgetMin || 1000) * 0.4),
              dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
              status: 'pending_funding',
            },
            {
              id: `m-${Date.now()}-2`,
              title: 'Phase 2: Core Engineering & Testing',
              description: 'Complete deliverables, end-to-end integration, and documentation',
              amount: Math.round(Number(projectData.budgetMin || 1000) * 0.6),
              dueDate: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
              status: 'pending_funding',
            },
          ],
        };
        localState.projects.unshift(newProject);
        return newProject;
      }
    );
  },

  async getBids(params?: { projectId?: string; freelancerId?: string }): Promise<Bid[]> {
    const query = new URLSearchParams();
    if (params?.projectId) query.append('projectId', params.projectId);
    if (params?.freelancerId) query.append('freelancerId', params.freelancerId);

    return resilientFetch<Bid[]>(
      `/api/bids?${query.toString()}`,
      undefined,
      () => {
        let result = [...localState.bids];
        if (params?.projectId) {
          result = result.filter((b) => b.projectId === params.projectId);
        }
        if (params?.freelancerId) {
          result = result.filter((b) => b.freelancerId === params.freelancerId);
        }
        return result;
      }
    );
  },

  async submitBid(bidData: {
    projectId: string;
    freelancerId: string;
    bidAmount: number;
    estimatedDeliveryDays: number;
    coverLetter: string;
    proposedMilestones: Array<{ title: string; amount: number; deliveryDays: number }>;
    portfolioLinks?: string[];
  }): Promise<Bid> {
    return resilientFetch<Bid>(
      '/api/bids',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bidData),
      },
      () => {
        const freelancer = localState.users[bidData.freelancerId] || INITIAL_USERS['user-freelancer-1'];
        const targetProj = localState.projects.find((p) => p.id === bidData.projectId);
        const newBid: Bid = {
          id: `bid-${Date.now()}`,
          projectId: bidData.projectId,
          projectTitle: targetProj?.title || 'Freelance Project',
          freelancerId: bidData.freelancerId,
          freelancerName: freelancer.name,
          freelancerAvatar: freelancer.avatar,
          freelancerTitle: freelancer.title,
          freelancerRating: freelancer.rating,
          freelancerCompletedJobs: freelancer.completedJobs,
          bidAmount: Number(bidData.bidAmount),
          estimatedDeliveryDays: Number(bidData.estimatedDeliveryDays),
          coverLetter: bidData.coverLetter,
          proposedMilestones: bidData.proposedMilestones || [],
          status: 'pending',
          createdAt: new Date().toISOString(),
          portfolioLinks: bidData.portfolioLinks || [],
        };
        localState.bids.unshift(newBid);

        // Update project bids count and avgBidAmount
        const project = localState.projects.find((p) => p.id === bidData.projectId);
        if (project) {
          project.bidsCount += 1;
          const projectBids = localState.bids.filter((b) => b.projectId === bidData.projectId);
          if (projectBids.length > 0) {
            const sum = projectBids.reduce((acc, b) => acc + b.bidAmount, 0);
            project.avgBidAmount = Math.round(sum / projectBids.length);
          }
        }
        return newBid;
      }
    );
  },

  async acceptBid(bidId: string): Promise<{ bid: Bid; project: Project; contract: Contract }> {
    return resilientFetch<{ bid: Bid; project: Project; contract: Contract }>(
      `/api/bids/${bidId}/accept`,
      { method: 'POST' },
      () => {
        const bid = localState.bids.find((b) => b.id === bidId) || localState.bids[0];
        bid.status = 'accepted';

        const project = localState.projects.find((p) => p.id === bid.projectId) || localState.projects[0];
        project.status = 'in_progress';

        const newContract: Contract = {
          id: `cnt-${Date.now()}`,
          projectId: project.id,
          projectTitle: project.title,
          clientId: project.clientId,
          clientName: project.clientName,
          freelancerId: bid.freelancerId,
          freelancerName: bid.freelancerName,
          totalAmount: bid.bidAmount,
          escrowFunded: bid.proposedMilestones[0]?.amount || Math.round(bid.bidAmount * 0.4),
          escrowReleased: 0,
          status: 'active',
          startDate: new Date().toISOString(),
          milestones: bid.proposedMilestones.map((m, idx) => ({
            id: `m-${Date.now()}-${idx + 1}`,
            title: m.title,
            description: `Milestone deliverable for ${project.title}`,
            amount: m.amount,
            dueDate: new Date(Date.now() + (m.deliveryDays || 14) * 86400000).toISOString().split('T')[0],
            status: idx === 0 ? 'funded' : 'pending_funding',
          })),
        };

        localState.contracts.unshift(newContract);
        return { bid, project, contract: newContract };
      }
    );
  },

  async getContracts(params?: { clientId?: string; freelancerId?: string }): Promise<Contract[]> {
    const query = new URLSearchParams();
    if (params?.clientId) query.append('clientId', params.clientId);
    if (params?.freelancerId) query.append('freelancerId', params.freelancerId);

    return resilientFetch<Contract[]>(
      `/api/contracts?${query.toString()}`,
      undefined,
      () => {
        let result = [...localState.contracts];
        if (params?.clientId) {
          result = result.filter((c) => c.clientId === params.clientId);
        }
        if (params?.freelancerId) {
          result = result.filter((c) => c.freelancerId === params.freelancerId);
        }
        return result;
      }
    );
  },

  async getContract(id: string): Promise<Contract & { messages: Message[]; documents: DocumentItem[]; dispute?: Dispute }> {
    return resilientFetch<Contract & { messages: Message[]; documents: DocumentItem[]; dispute?: Dispute }>(
      `/api/contracts/${id}`,
      undefined,
      () => {
        const contract = localState.contracts.find((c) => c.id === id) || localState.contracts[0];
        const messages = localState.messages[id] || [];
        const documents = localState.documents[id] || [];
        const dispute = localState.disputes.find((d) => d.contractId === id);
        return { ...contract, messages, documents, dispute };
      }
    );
  },

  async fundMilestone(contractId: string, milestoneId: string): Promise<any> {
    return resilientFetch<any>(
      `/api/contracts/${contractId}/milestones/${milestoneId}/fund`,
      { method: 'POST' },
      () => {
        const contract = localState.contracts.find((c) => c.id === contractId);
        if (contract) {
          const milestone = contract.milestones.find((m) => m.id === milestoneId);
          if (milestone) {
            milestone.status = 'funded';
            contract.escrowFunded += milestone.amount;
          }
        }
        return { success: true, contract };
      }
    );
  },

  async submitMilestone(contractId: string, milestoneId: string, payload: { notes: string; files?: string[] }): Promise<any> {
    return resilientFetch<any>(
      `/api/contracts/${contractId}/milestones/${milestoneId}/submit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        const contract = localState.contracts.find((c) => c.id === contractId);
        if (contract) {
          const milestone = contract.milestones.find((m) => m.id === milestoneId);
          if (milestone) {
            milestone.status = 'submitted';
            milestone.deliverableNotes = payload.notes;
            milestone.submissionDate = new Date().toISOString();
          }
        }
        return { success: true, contract };
      }
    );
  },

  async approveMilestone(contractId: string, milestoneId: string): Promise<any> {
    return resilientFetch<any>(
      `/api/contracts/${contractId}/milestones/${milestoneId}/approve`,
      { method: 'POST' },
      () => {
        const contract = localState.contracts.find((c) => c.id === contractId);
        if (contract) {
          const milestone = contract.milestones.find((m) => m.id === milestoneId);
          if (milestone) {
            milestone.status = 'approved';
            contract.escrowReleased += milestone.amount;
            contract.escrowFunded = Math.max(0, contract.escrowFunded - milestone.amount);
          }
          // If all milestones approved, mark contract completed
          if (contract.milestones.every((m) => m.status === 'approved')) {
            contract.status = 'completed';
          }
        }
        return { success: true, contract };
      }
    );
  },

  async requestRevision(contractId: string, milestoneId: string, feedback: string): Promise<any> {
    return resilientFetch<any>(
      `/api/contracts/${contractId}/milestones/${milestoneId}/request-revision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      },
      () => {
        const contract = localState.contracts.find((c) => c.id === contractId);
        if (contract) {
          const milestone = contract.milestones.find((m) => m.id === milestoneId);
          if (milestone) {
            milestone.status = 'revision_requested';
            milestone.deliverableNotes = `Revision Requested: ${feedback}`;
          }
        }
        return { success: true, contract };
      }
    );
  },

  async getDisputes(): Promise<Dispute[]> {
    return resilientFetch<Dispute[]>(
      '/api/disputes',
      undefined,
      () => localState.disputes
    );
  },

  async raiseDispute(payload: {
    contractId: string;
    milestoneId?: string;
    reason: string;
    description: string;
    raisedById: string;
    evidence?: Array<{ title: string; description: string; fileUrl?: string }>;
  }): Promise<Dispute> {
    return resilientFetch<Dispute>(
      '/api/disputes',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        const contract = localState.contracts.find((c) => c.id === payload.contractId) || localState.contracts[0];
        contract.status = 'disputed';

        const milestone = payload.milestoneId
          ? contract.milestones.find((m) => m.id === payload.milestoneId)
          : contract.milestones[0];
        if (milestone) {
          milestone.status = 'disputed';
        }

        const raisedByUser = localState.users[payload.raisedById] || INITIAL_USERS_LIST[0];
        const respondentUser =
          payload.raisedById === contract.clientId
            ? localState.users[contract.freelancerId] || INITIAL_USERS['user-freelancer-1']
            : localState.users[contract.clientId] || INITIAL_USERS['user-client-1'];

        const newDispute: Dispute = {
          id: `disp-${Date.now()}`,
          contractId: contract.id,
          projectTitle: contract.projectTitle,
          milestoneId: milestone?.id || 'm-general',
          milestoneTitle: milestone?.title || 'Contract Scope Dispute',
          amountInDispute: milestone?.amount || contract.escrowFunded || 1000,
          raisedBy: {
            id: raisedByUser.id,
            name: raisedByUser.name,
            role: raisedByUser.role,
          },
          against: {
            id: respondentUser.id,
            name: respondentUser.name,
            role: respondentUser.role,
          },
          reason: payload.reason,
          description: payload.description,
          evidence: (payload.evidence || []).map((e, idx) => ({
            id: `ev-${Date.now()}-${idx}`,
            submittedBy: raisedByUser.name,
            title: e.title,
            description: e.description,
            fileUrl: e.fileUrl,
            timestamp: new Date().toISOString(),
          })),
          status: 'open',
          mediatorNotes: 'Case submitted for administrative review under the 48-Hour Fair Arbitration Protocol.',
          createdAt: new Date().toISOString(),
        };

        localState.disputes.unshift(newDispute);
        return newDispute;
      }
    );
  },

  async resolveDispute(
    disputeId: string,
    payload: {
      outcome: string;
      mediatorNotes: string;
      freelancerPayout?: number;
      clientRefund?: number;
    }
  ): Promise<any> {
    return resilientFetch<any>(
      `/api/disputes/${disputeId}/resolve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        const dispute = localState.disputes.find((d) => d.id === disputeId);
        if (dispute) {
          dispute.status = 'resolved';
          dispute.mediatorNotes = payload.mediatorNotes;
          dispute.outcome = payload.outcome as any;
          dispute.freelancerPayout = payload.freelancerPayout;
          dispute.clientRefund = payload.clientRefund;
          dispute.resolvedAt = new Date().toISOString();
        }
        return { success: true, dispute };
      }
    );
  },

  async sendMessage(contractId: string, message: {
    senderId: string;
    senderName: string;
    senderRole: string;
    text: string;
    attachmentName?: string;
    attachmentSize?: string;
  }): Promise<Message> {
    return resilientFetch<Message>(
      `/api/contracts/${contractId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      },
      () => {
        if (!localState.messages[contractId]) {
          localState.messages[contractId] = [];
        }
        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          contractId,
          senderId: message.senderId,
          senderName: message.senderName,
          senderRole: message.senderRole as any,
          text: message.text,
          timestamp: new Date().toISOString(),
          attachmentName: message.attachmentName,
          attachmentSize: message.attachmentSize,
        };
        localState.messages[contractId].push(newMessage);
        return newMessage;
      }
    );
  },

  async uploadDocument(contractId: string, doc: {
    name: string;
    type: string;
    size: string;
    uploadedBy: string;
    uploaderRole: string;
    milestoneId?: string;
  }): Promise<DocumentItem> {
    return resilientFetch<DocumentItem>(
      `/api/contracts/${contractId}/documents`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      },
      () => {
        if (!localState.documents[contractId]) {
          localState.documents[contractId] = [];
        }
        const newDoc: DocumentItem = {
          id: `doc-${Date.now()}`,
          contractId,
          name: doc.name,
          type: doc.type,
          size: doc.size,
          uploadedBy: doc.uploadedBy,
          uploaderRole: doc.uploaderRole as any,
          uploadedAt: new Date().toISOString(),
          milestoneId: doc.milestoneId,
          url: '#',
          status: 'submitted',
        };
        localState.documents[contractId].unshift(newDoc);
        return newDoc;
      }
    );
  },

  // Gemini AI Helpers
  async craftProposalAI(payload: {
    projectTitle: string;
    projectDescription: string;
    skills: string[];
    budgetRange: string;
    freelancerExperience: string;
  }): Promise<{
    coverLetter: string;
    keyHighlights: string[];
    suggestedBidAmount: number;
    estimatedDays: number;
    milestoneBreakdown: Array<{ title: string; amount: number; days: number }>;
  }> {
    return resilientFetch(
      '/api/ai/craft-proposal',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        // High quality contextual fallback
        return {
          coverLetter: `Dear Hiring Team,\n\nI reviewed your requirements for "${payload.projectTitle}" and would welcome the opportunity to deliver this project with high architectural rigor. With extensive production experience in ${payload.skills.slice(0, 3).join(', ')}, I can implement this with clean type contracts, structured milestones, and secure verification.\n\nMy proposed plan breaks the work into tangible verification gates so you can test each deliverable in escrow before funds are disbursed. Looking forward to discussing the technical details.\n\nBest regards,\nElena Rostova`,
          keyHighlights: [
            `Demonstrated mastery in ${payload.skills.join(', ')} with verified enterprise deployments`,
            'Zero-compromise milestone-driven workflow ensuring clear acceptance criteria',
            'Full documentation, JaCoCo/Vitest test suite, and clean Docker deployment scripts',
          ],
          suggestedBidAmount: 4200,
          estimatedDays: 14,
          milestoneBreakdown: [
            {
              title: 'Phase 1: Architecture, Data Models & Initial Endpoints',
              amount: 1800,
              days: 6,
            },
            {
              title: 'Phase 2: Complete Implementation, E2E Verification & Handover',
              amount: 2400,
              days: 8,
            },
          ],
        };
      }
    );
  },

  async generateProjectSpecAI(payload: {
    briefIdea: string;
    industry?: string;
    estimatedBudget?: string;
  }): Promise<{
    title: string;
    detailedDescription: string;
    suggestedCategory: string;
    suggestedSkills: string[];
    suggestedBudgetMin: number;
    suggestedBudgetMax: number;
    suggestedMilestones: Array<{
      title: string;
      description: string;
      amount: number;
      deliveryDays: number;
    }>;
  }> {
    return resilientFetch(
      '/api/ai/generate-project-spec',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        return {
          title: payload.briefIdea.length > 10 ? payload.briefIdea : 'High-Performance Distributed Full Stack Platform',
          detailedDescription: `Seeking an expert engineering specialist to deliver a production-ready application for ${payload.briefIdea}.\n\nCore deliverables include:\n- Secure REST/GraphQL service layer with comprehensive input validation\n- Responsive, high-fidelity frontend with live state updates\n- Containerized deployment configuration and clear technical documentation.`,
          suggestedCategory: 'Full Stack Development',
          suggestedSkills: ['React 19', 'TypeScript', 'Spring Boot', 'PostgreSQL', 'Docker'],
          suggestedBudgetMin: 3500,
          suggestedBudgetMax: 6500,
          suggestedMilestones: [
            {
              title: 'Milestone 1: Architectural Blueprint & Scaffolding',
              description: 'Domain modeling, API specifications, and foundation setup',
              amount: 1750,
              deliveryDays: 7,
            },
            {
              title: 'Milestone 2: Feature Implementation & Verification',
              description: 'Core business logic, responsive UI views, and unit/integration tests',
              amount: 3250,
              deliveryDays: 14,
            },
          ],
        };
      }
    );
  },

  async analyzeDisputeAI(payload: {
    disputeReason: string;
    description: string;
    evidenceSummary: string;
    contractAmount: number;
  }): Promise<{
    caseSummary: string;
    keyFindings: string[];
    recommendedOutcome: 'RELEASE_TO_FREELANCER' | 'REFUND_CLIENT' | 'SPLIT_50_50';
    suggestedFreelancerPayout: number;
    suggestedClientRefund: number;
    mediationRationale: string;
  }> {
    return resilientFetch(
      '/api/ai/analyze-dispute',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        const half = Math.round(payload.contractAmount / 2);
        return {
          caseSummary: `Dispute centered on: ${payload.disputeReason}. Both parties submitted technical claims regarding milestone acceptance specifications.`,
          keyFindings: [
            'Deliverables were partially submitted in the document repository meeting core functional criteria.',
            'Client reported performance benchmarks falling slightly below peak SLA targets.',
            'Good faith effort demonstrated by both sides without contractual bad faith.',
          ],
          recommendedOutcome: 'SPLIT_50_50',
          suggestedFreelancerPayout: half,
          suggestedClientRefund: payload.contractAmount - half,
          mediationRationale:
            'A fair 50/50 resolution honors the substantial engineering work completed while accounting for the client’s need for additional performance optimization.',
        };
      }
    );
  },
};
