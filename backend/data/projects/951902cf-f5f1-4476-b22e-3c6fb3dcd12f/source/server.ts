import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  INITIAL_PROJECTS,
  INITIAL_BIDS,
  INITIAL_CONTRACTS,
  INITIAL_DISPUTES,
  INITIAL_MESSAGES,
  INITIAL_DOCUMENTS,
  INITIAL_USERS,
} from './src/data/initialData.ts';
import {
  Project,
  Bid,
  Contract,
  Dispute,
  Message,
  DocumentItem,
  UserProfile,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory data stores initialized with seed data
let projects: Project[] = JSON.parse(JSON.stringify(INITIAL_PROJECTS));
let bids: Bid[] = JSON.parse(JSON.stringify(INITIAL_BIDS));
let contracts: Contract[] = JSON.parse(JSON.stringify(INITIAL_CONTRACTS));
let disputes: Dispute[] = JSON.parse(JSON.stringify(INITIAL_DISPUTES));
let messages: Record<string, Message[]> = JSON.parse(JSON.stringify(INITIAL_MESSAGES));
let documents: Record<string, DocumentItem[]> = JSON.parse(JSON.stringify(INITIAL_DOCUMENTS));
let users: Record<string, UserProfile> = JSON.parse(JSON.stringify(INITIAL_USERS));

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS middleware for browser and iframe preview support
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Bid Forge API Service' });
  });

  // ==================== USERS & STATS ====================
  app.get('/api/users', (req, res) => {
    res.json(Object.values(users));
  });

  app.get('/api/users/:id', (req, res) => {
    const user = users[req.params.id];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  // ==================== PROJECTS ====================
  app.get('/api/projects', (req, res) => {
    let result = [...projects];
    const { category, search, status, minBudget, maxBudget } = req.query;

    if (category && typeof category === 'string' && category !== 'All') {
      result = result.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    if (status && typeof status === 'string' && status !== 'All') {
      result = result.filter((p) => p.status === status);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.skills.some((s) => s.toLowerCase().includes(q))
      );
    }
    if (minBudget) {
      result = result.filter((p) => p.budgetMax >= Number(minBudget));
    }
    if (maxBudget) {
      result = result.filter((p) => p.budgetMin <= Number(maxBudget));
    }

    res.json(result);
  });

  app.get('/api/projects/:id', (req, res) => {
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const projectBids = bids.filter((b) => b.projectId === project.id);
    const contract = contracts.find((c) => c.projectId === project.id);
    res.json({ ...project, bids: projectBids, contract });
  });

  app.post('/api/projects', (req, res) => {
    const {
      title,
      description,
      category,
      clientId,
      clientName,
      budgetType,
      budgetMin,
      budgetMax,
      experienceLevel,
      duration,
      skills,
      initialMilestones,
    } = req.body;

    if (!title || !description || !budgetMin || !budgetMax) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      title,
      description,
      category: category || 'Full Stack Development',
      clientId: clientId || 'user-client-1',
      clientName: clientName || users[clientId]?.name || 'Alex Rivera',
      clientCompany: users[clientId]?.title || 'Client Company',
      clientRating: users[clientId]?.rating || 4.95,
      clientLocation: 'Remote',
      budgetType: budgetType || 'milestone',
      budgetMin: Number(budgetMin),
      budgetMax: Number(budgetMax),
      experienceLevel: experienceLevel || 'expert',
      duration: duration || '2-4 weeks',
      skills: Array.isArray(skills) ? skills : ['React', 'TypeScript'],
      status: 'open',
      bidsCount: 0,
      avgBidAmount: 0,
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      initialMilestones: initialMilestones || [
        {
          id: `m-${Date.now()}-1`,
          title: 'Initial Architecture & Setup',
          description: 'Project scaffolding and requirements spec',
          amount: Math.round(Number(budgetMin) * 0.4),
          dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
          status: 'pending_funding',
        },
        {
          id: `m-${Date.now()}-2`,
          title: 'Final Implementation & Testing',
          description: 'Core feature completion and verification',
          amount: Math.round(Number(budgetMin) * 0.6),
          dueDate: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
          status: 'pending_funding',
        },
      ],
    };

    projects.unshift(newProject);
    res.status(201).json(newProject);
  });

  // ==================== BIDS ====================
  app.get('/api/bids', (req, res) => {
    const { projectId, freelancerId } = req.query;
    let result = [...bids];
    if (projectId) {
      result = result.filter((b) => b.projectId === projectId);
    }
    if (freelancerId) {
      result = result.filter((b) => b.freelancerId === freelancerId);
    }
    res.json(result);
  });

  app.post('/api/bids', (req, res) => {
    const {
      projectId,
      freelancerId,
      bidAmount,
      estimatedDeliveryDays,
      coverLetter,
      proposedMilestones,
      portfolioLinks,
    } = req.body;

    const project = projects.find((p) => p.id === projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const freelancer = users[freelancerId] || users['user-freelancer-1'];

    const newBid: Bid = {
      id: `bid-${Date.now()}`,
      projectId,
      projectTitle: project.title,
      freelancerId: freelancer.id,
      freelancerName: freelancer.name,
      freelancerAvatar: freelancer.avatar,
      freelancerTitle: freelancer.title,
      freelancerRating: freelancer.rating,
      freelancerCompletedJobs: freelancer.completedJobs,
      bidAmount: Number(bidAmount),
      estimatedDeliveryDays: Number(estimatedDeliveryDays) || 14,
      coverLetter,
      proposedMilestones: proposedMilestones || [
        {
          title: 'Milestone 1: Deliverables',
          amount: Number(bidAmount),
          deliveryDays: Number(estimatedDeliveryDays) || 14,
        },
      ],
      portfolioLinks: portfolioLinks || ['https://github.com/profile'],
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    bids.unshift(newBid);

    // Update project bids count and avg
    project.bidsCount += 1;
    const projectBids = bids.filter((b) => b.projectId === projectId);
    const sum = projectBids.reduce((acc, b) => acc + b.bidAmount, 0);
    project.avgBidAmount = Math.round(sum / projectBids.length);

    res.status(201).json(newBid);
  });

  // Accept Bid & Generate Milestone-based Contract
  app.post('/api/bids/:id/accept', (req, res) => {
    const bid = bids.find((b) => b.id === req.params.id);
    if (!bid) return res.status(404).json({ error: 'Bid not found' });

    const project = projects.find((p) => p.id === bid.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    bid.status = 'accepted';
    project.status = 'in_progress';
    project.awardedFreelancerId = bid.freelancerId;

    // Create milestones for contract
    const contractMilestones = bid.proposedMilestones.map((m, idx) => ({
      id: `m-${Date.now()}-${idx + 1}`,
      title: m.title,
      description: `Agreed deliverable for milestone ${idx + 1}`,
      amount: m.amount,
      dueDate: new Date(Date.now() + (idx + 1) * m.deliveryDays * 86400000)
        .toISOString()
        .split('T')[0],
      status: (idx === 0 ? 'funded' : 'pending_funding') as any, // First milestone automatically funded into escrow
    }));

    const firstMilestoneAmount = contractMilestones[0]?.amount || 0;

    const contract: Contract = {
      id: `cnt-${Date.now()}`,
      projectId: project.id,
      projectTitle: project.title,
      clientId: project.clientId,
      clientName: project.clientName,
      freelancerId: bid.freelancerId,
      freelancerName: bid.freelancerName,
      totalAmount: bid.bidAmount,
      escrowFunded: firstMilestoneAmount,
      escrowReleased: 0,
      status: 'active',
      startDate: new Date().toISOString(),
      milestones: contractMilestones,
    };

    project.contractId = contract.id;
    contracts.unshift(contract);

    // Initialize initial greeting message in workspace
    messages[contract.id] = [
      {
        id: `msg-${Date.now()}`,
        contractId: contract.id,
        senderId: project.clientId,
        senderName: project.clientName,
        senderRole: 'client',
        text: `Congratulations ${bid.freelancerName}! Bid accepted and milestone contract initiated. The first milestone ($${firstMilestoneAmount.toLocaleString()}) is now funded in Bid Forge Escrow. Let's get started!`,
        timestamp: new Date().toISOString(),
      },
    ];

    res.json({ bid, project, contract });
  });

  // ==================== CONTRACTS & ESCROW ====================
  app.get('/api/contracts', (req, res) => {
    const { clientId, freelancerId } = req.query;
    let result = [...contracts];
    if (clientId) {
      result = result.filter((c) => c.clientId === clientId);
    }
    if (freelancerId) {
      result = result.filter((c) => c.freelancerId === freelancerId);
    }
    res.json(result);
  });

  app.get('/api/contracts/:id', (req, res) => {
    const contract = contracts.find((c) => c.id === req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const contractMessages = messages[contract.id] || [];
    const contractDocs = documents[contract.id] || [];
    const dispute = disputes.find((d) => d.contractId === contract.id);

    res.json({
      ...contract,
      messages: contractMessages,
      documents: contractDocs,
      dispute,
    });
  });

  // Client funds a milestone into Escrow
  app.post('/api/contracts/:id/milestones/:mId/fund', (req, res) => {
    const contract = contracts.find((c) => c.id === req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const milestone = contract.milestones.find((m) => m.id === req.params.mId);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    milestone.status = 'funded';
    contract.escrowFunded += milestone.amount;

    // Add activity message
    const msgList = messages[contract.id] || [];
    msgList.push({
      id: `msg-${Date.now()}`,
      contractId: contract.id,
      senderId: contract.clientId,
      senderName: contract.clientName,
      senderRole: 'client',
      text: `Funded $${milestone.amount.toLocaleString()} into Escrow for milestone "${milestone.title}". Work may commence.`,
      timestamp: new Date().toISOString(),
    });
    messages[contract.id] = msgList;

    res.json({ contract, milestone });
  });

  // Freelancer submits milestone deliverables
  app.post('/api/contracts/:id/milestones/:mId/submit', (req, res) => {
    const { notes, files } = req.body;
    const contract = contracts.find((c) => c.id === req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const milestone = contract.milestones.find((m) => m.id === req.params.mId);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    milestone.status = 'submitted';
    milestone.deliverableNotes = notes || 'Deliverable ready for inspection';
    milestone.deliverableFiles = files || [];
    milestone.submissionDate = new Date().toISOString();

    // Add activity message
    const msgList = messages[contract.id] || [];
    msgList.push({
      id: `msg-${Date.now()}`,
      contractId: contract.id,
      senderId: contract.freelancerId,
      senderName: contract.freelancerName,
      senderRole: 'freelancer',
      text: `Submitted deliverable for "${milestone.title}". Notes: ${milestone.deliverableNotes}`,
      timestamp: new Date().toISOString(),
    });
    messages[contract.id] = msgList;

    res.json({ contract, milestone });
  });

  // Client approves milestone & releases Escrow
  app.post('/api/contracts/:id/milestones/:mId/approve', (req, res) => {
    const contract = contracts.find((c) => c.id === req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const milestone = contract.milestones.find((m) => m.id === req.params.mId);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    milestone.status = 'approved';
    milestone.approvedDate = new Date().toISOString();

    // Release escrow funds
    contract.escrowReleased += milestone.amount;
    contract.escrowFunded = Math.max(0, contract.escrowFunded - milestone.amount);

    // Update freelancer wallet balance
    if (users[contract.freelancerId]) {
      users[contract.freelancerId].totalEarned =
        (users[contract.freelancerId].totalEarned || 0) + milestone.amount;
    }

    // Check if all milestones completed
    const allApproved = contract.milestones.every((m) => m.status === 'approved');
    if (allApproved) {
      contract.status = 'completed';
      contract.completionDate = new Date().toISOString();
      const proj = projects.find((p) => p.id === contract.projectId);
      if (proj) proj.status = 'completed';
    }

    // Add message
    const msgList = messages[contract.id] || [];
    msgList.push({
      id: `msg-${Date.now()}`,
      contractId: contract.id,
      senderId: contract.clientId,
      senderName: contract.clientName,
      senderRole: 'client',
      text: `Milestone "${milestone.title}" approved! $${milestone.amount.toLocaleString()} released from Escrow to ${contract.freelancerName}'s account.`,
      timestamp: new Date().toISOString(),
    });
    messages[contract.id] = msgList;

    res.json({ contract, milestone });
  });

  // Client requests revision
  app.post('/api/contracts/:id/milestones/:mId/request-revision', (req, res) => {
    const { feedback } = req.body;
    const contract = contracts.find((c) => c.id === req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const milestone = contract.milestones.find((m) => m.id === req.params.mId);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    milestone.status = 'revision_requested';

    const msgList = messages[contract.id] || [];
    msgList.push({
      id: `msg-${Date.now()}`,
      contractId: contract.id,
      senderId: contract.clientId,
      senderName: contract.clientName,
      senderRole: 'client',
      text: `Revision requested for "${milestone.title}". Feedback: ${feedback || 'Please review requested adjustments'}`,
      timestamp: new Date().toISOString(),
    });
    messages[contract.id] = msgList;

    res.json({ contract, milestone });
  });

  // ==================== DISPUTES & ADMIN MEDIATION ====================
  app.get('/api/disputes', (req, res) => {
    res.json(disputes);
  });

  app.post('/api/disputes', (req, res) => {
    const {
      contractId,
      milestoneId,
      reason,
      description,
      raisedById,
      evidence,
    } = req.body;

    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const milestone = milestoneId
      ? contract.milestones.find((m) => m.id === milestoneId)
      : contract.milestones.find((m) => m.status === 'submitted' || m.status === 'funded');

    if (milestone) {
      milestone.status = 'disputed';
    }
    contract.status = 'disputed';

    const raisedByUser = users[raisedById] || users['user-client-1'];
    const againstUser =
      raisedByUser.role === 'client'
        ? users[contract.freelancerId]
        : users[contract.clientId];

    const newDispute: Dispute = {
      id: `disp-${Date.now()}`,
      contractId,
      projectTitle: contract.projectTitle,
      milestoneId: milestone?.id,
      milestoneTitle: milestone?.title || 'Contract Scope Dispute',
      amountInDispute: milestone?.amount || contract.escrowFunded || 2000,
      raisedBy: {
        id: raisedByUser.id,
        name: raisedByUser.name,
        role: raisedByUser.role,
      },
      against: {
        id: againstUser.id,
        name: againstUser.name,
        role: againstUser.role,
      },
      reason: reason || 'Contract Expectation Discrepancy',
      description,
      evidence: evidence || [],
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    contract.disputeId = newDispute.id;
    disputes.unshift(newDispute);

    // Add alert message
    const msgList = messages[contract.id] || [];
    msgList.push({
      id: `msg-${Date.now()}`,
      contractId: contract.id,
      senderId: 'system',
      senderName: 'Bid Forge Trust & Safety',
      senderRole: 'admin',
      text: `Formal dispute raised by ${raisedByUser.name}. Escrow funds ($${newDispute.amountInDispute.toLocaleString()}) are locked under mediation review by Marcus Vance.`,
      timestamp: new Date().toISOString(),
    });
    messages[contract.id] = msgList;

    res.status(201).json(newDispute);
  });

  // Admin Mediator Ruling
  app.post('/api/disputes/:id/resolve', (req, res) => {
    const { outcome, mediatorNotes, freelancerPayout, clientRefund } = req.body;
    const dispute = disputes.find((d) => d.id === req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

    const contract = contracts.find((c) => c.id === dispute.contractId);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    dispute.status = 'resolved';
    dispute.outcome = outcome;
    dispute.mediatorNotes = mediatorNotes;
    dispute.mediatorName = 'Marcus Vance (Chief Mediator)';
    dispute.resolvedAt = new Date().toISOString();

    const totalInDispute = dispute.amountInDispute;
    let flShare = 0;
    let clShare = 0;

    if (outcome === 'RELEASE_TO_FREELANCER') {
      flShare = totalInDispute;
      clShare = 0;
    } else if (outcome === 'REFUND_CLIENT') {
      flShare = 0;
      clShare = totalInDispute;
    } else if (outcome === 'SPLIT_50_50') {
      flShare = Math.round(totalInDispute / 2);
      clShare = totalInDispute - flShare;
    } else if (outcome === 'CUSTOM_SPLIT') {
      flShare = Number(freelancerPayout) || 0;
      clShare = Number(clientRefund) || 0;
    }

    dispute.freelancerPayout = flShare;
    dispute.clientRefund = clShare;

    // Escrow reallocation
    contract.escrowReleased += flShare;
    contract.escrowFunded = Math.max(0, contract.escrowFunded - totalInDispute);
    contract.status = 'active';

    if (dispute.milestoneId) {
      const milestone = contract.milestones.find((m) => m.id === dispute.milestoneId);
      if (milestone) {
        milestone.status = flShare > 0 ? 'approved' : 'revision_requested';
      }
    }

    // Add mediation notice in messages
    const msgList = messages[contract.id] || [];
    msgList.push({
      id: `msg-${Date.now()}`,
      contractId: contract.id,
      senderId: 'user-admin-1',
      senderName: 'Marcus Vance (Dispute Mediator)',
      senderRole: 'admin',
      text: `OFFICIAL MEDIATION RESOLUTION: ${outcome}. Payout to Freelancer: $${flShare.toLocaleString()} | Refund to Client: $${clShare.toLocaleString()}. Ruling notes: ${mediatorNotes}`,
      timestamp: new Date().toISOString(),
    });
    messages[contract.id] = msgList;

    res.json({ dispute, contract });
  });

  // ==================== MESSAGES & DOCUMENTS ====================
  app.get('/api/contracts/:id/messages', (req, res) => {
    res.json(messages[req.params.id] || []);
  });

  app.post('/api/contracts/:id/messages', (req, res) => {
    const { senderId, senderName, senderRole, text, attachmentName, attachmentSize } = req.body;
    if (!text && !attachmentName) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      contractId: req.params.id,
      senderId: senderId || 'user-client-1',
      senderName: senderName || 'User',
      senderRole: senderRole || 'client',
      text: text || '',
      timestamp: new Date().toISOString(),
      attachmentName,
      attachmentSize,
    };

    if (!messages[req.params.id]) {
      messages[req.params.id] = [];
    }
    messages[req.params.id].push(newMessage);

    res.status(201).json(newMessage);
  });

  app.get('/api/contracts/:id/documents', (req, res) => {
    res.json(documents[req.params.id] || []);
  });

  app.post('/api/contracts/:id/documents', (req, res) => {
    const { name, type, size, uploadedBy, uploaderRole, milestoneId, status } = req.body;

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      contractId: req.params.id,
      name: name || 'Document.pdf',
      type: type || 'pdf',
      size: size || '1.5 MB',
      uploadedBy: uploadedBy || 'User',
      uploaderRole: uploaderRole || 'freelancer',
      uploadedAt: new Date().toISOString(),
      milestoneId,
      url: '#',
      status: status || 'submitted',
    };

    if (!documents[req.params.id]) {
      documents[req.params.id] = [];
    }
    documents[req.params.id].push(newDoc);

    res.status(201).json(newDoc);
  });

  // ==================== GEMINI AI FEATURES ====================
  // 1. AI Bid Proposal Crafting Assistant
  app.post('/api/ai/craft-proposal', async (req, res) => {
    const { projectTitle, projectDescription, skills, budgetRange, freelancerExperience } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        coverLetter: `Dear Hiring Team,\n\nI am writing to express my strong interest in your project "${projectTitle}". With deep expertise in ${Array.isArray(skills) ? skills.join(', ') : 'modern full-stack engineering'}, I have delivered similar milestone-driven systems that emphasize clear architecture, responsive communication, and rock-solid reliability.\n\nMy proposed milestones ensure you review tangible deliverables at every phase before any escrow release. I look forward to partnering with you to bring this vision to life.\n\nBest regards,\nElena Rostova`,
        keyHighlights: [
          'Direct experience in production-grade architecture and unit testing',
          'Strict adherence to milestone timelines and automated CI/CD verification',
          'Transparent daily standup notes and document deliverable packaging',
        ],
        suggestedBidAmount: 5200,
        estimatedDays: 21,
        milestoneBreakdown: [
          { title: 'Milestone 1: Architectural Specification & API Contract', amount: 1500, days: 6 },
          { title: 'Milestone 2: Core Service Implementation & Security', amount: 2000, days: 9 },
          { title: 'Milestone 3: UI Integration, Testing & Handover', amount: 1700, days: 6 },
        ],
      });
    }

    try {
      const prompt = `You are an elite freelance bid strategist on Bid Forge platform.
Craft a compelling, highly professional freelance job proposal for:
Project Title: ${projectTitle}
Project Description: ${projectDescription}
Required Skills: ${Array.isArray(skills) ? skills.join(', ') : skills}
Budget Range: ${budgetRange || 'Competitive'}
Freelancer Background: ${freelancerExperience || 'Senior Full Stack Engineer'}

Return a valid JSON object with:
{
  "coverLetter": "Persuasive 3-paragraph cover letter showing deep technical understanding, specific approach, and risk mitigation",
  "keyHighlights": ["3 strong value propositions"],
  "suggestedBidAmount": number,
  "estimatedDays": number,
  "milestoneBreakdown": [
    { "title": "Milestone title", "amount": number, "days": number }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      res.json(JSON.parse(text));
    } catch (err: any) {
      console.error('Gemini error:', err);
      res.status(500).json({ error: 'Failed to generate proposal: ' + err.message });
    }
  });

  // 2. AI Project Specification Generator for Clients
  app.post('/api/ai/generate-project-spec', async (req, res) => {
    const { briefIdea, industry, estimatedBudget } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        title: briefIdea ? `Enterprise ${briefIdea}` : 'High-Performance Cloud Web Application',
        detailedDescription: `A production-ready platform designed for scalability, intuitive user workflow, and high reliability. The solution requires a modern responsive frontend, robust REST/GraphQL APIs, secure authentication, and clear automated testing protocols.`,
        suggestedCategory: 'Full Stack Development',
        suggestedSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'REST API'],
        suggestedBudgetMin: 3500,
        suggestedBudgetMax: 6000,
        suggestedMilestones: [
          { title: 'Milestone 1: Wireframes & OpenAPI Specifications', description: 'System design doc and endpoint definitions', amount: 1500, deliveryDays: 7 },
          { title: 'Milestone 2: Backend Core & Database Integration', description: 'Data schemas, business logic, and automated tests', amount: 2500, deliveryDays: 14 },
          { title: 'Milestone 3: UI Dashboard & Production Handover', description: 'Interactive frontend and cloud deployment', amount: 1500, deliveryDays: 9 },
        ],
      });
    }

    try {
      const prompt = `You are a technical product manager on Bid Forge freelance platform.
Create a structured, crystal-clear project listing based on:
Idea: ${briefIdea}
Industry: ${industry || 'Tech / SaaS'}
Budget expectation: ${estimatedBudget || 'Flexible'}

Return valid JSON with:
{
  "title": "Concise, professional job title",
  "detailedDescription": "Comprehensive 2-3 paragraph project scope, functional requirements, and acceptance criteria",
  "suggestedCategory": "Category name",
  "suggestedSkills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
  "suggestedBudgetMin": number,
  "suggestedBudgetMax": number,
  "suggestedMilestones": [
    { "title": "Milestone title", "description": "Deliverables summary", "amount": number, "deliveryDays": number }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (err: any) {
      console.error('Gemini error:', err);
      res.status(500).json({ error: 'Failed to generate project spec: ' + err.message });
    }
  });

  // 3. AI Dispute Fair Settlement Analyzer for Admin Mediator
  app.post('/api/ai/analyze-dispute', async (req, res) => {
    const { disputeReason, description, evidenceSummary, contractAmount } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        caseSummary: 'The dispute centers on performance SLA variance and scope interpretation regarding concurrent query caching.',
        keyFindings: [
          'Agreed contract clause 4.2 specifically stated latency target expectations.',
          'Freelancer delivered functional core service, but peak load optimization was left unaddressed.',
          'Client did not provide dedicated test environment credentials until late in the cycle.',
        ],
        recommendedOutcome: 'SPLIT_50_50',
        suggestedFreelancerPayout: Math.round((contractAmount || 2800) * 0.5),
        suggestedClientRefund: Math.round((contractAmount || 2800) * 0.5),
        mediationRationale: 'A 50/50 escrow division accounts for the genuine engineering hours invested by the freelancer while acknowledging the client did not receive full SLA compliance without additional caching infrastructure.',
      });
    }

    try {
      const prompt = `You are an impartial dispute arbitration AI assisting the Bid Forge chief mediator.
Analyze this freelance contract dispute:
Reason: ${disputeReason}
Description: ${description}
Evidence: ${evidenceSummary}
Amount in Dispute: $${contractAmount}

Evaluate the claims objectively and return valid JSON with:
{
  "caseSummary": "Objective summary of the core disagreement",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendedOutcome": "RELEASE_TO_FREELANCER" | "REFUND_CLIENT" | "SPLIT_50_50",
  "suggestedFreelancerPayout": number,
  "suggestedClientRefund": number,
  "mediationRationale": "Clear, legally balanced explanation for the mediator's binding decision"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (err: any) {
      console.error('Gemini error:', err);
      res.status(500).json({ error: 'Failed to analyze dispute: ' + err.message });
    }
  });

  // ==================== VITE DEV OR STATIC PROD ====================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bid Forge Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
