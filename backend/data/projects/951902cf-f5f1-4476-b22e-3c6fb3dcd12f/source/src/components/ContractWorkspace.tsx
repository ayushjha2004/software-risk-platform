import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  Send,
  Upload,
  FileText,
  AlertTriangle,
  MessageSquare,
  FileCode,
  Download,
  Check,
  RefreshCw,
  X,
  Paperclip,
  Eye,
  UserCheck,
} from 'lucide-react';
import { Contract, MilestoneSpec, Message, DocumentItem, UserProfile } from '../types';
import { api } from '../services/api';
import { INITIAL_CONTRACTS, INITIAL_MESSAGES, INITIAL_DOCUMENTS } from '../data/initialData';

interface ContractWorkspaceProps {
  contractId: string;
  currentUser: UserProfile;
  onNavigateToDispute: (disputeId?: string) => void;
  onBackToExplore: () => void;
}

export const ContractWorkspace: React.FC<ContractWorkspaceProps> = ({
  contractId,
  currentUser,
  onNavigateToDispute,
  onBackToExplore,
}) => {
  const [contract, setContract] = useState<
    (Contract & { messages: Message[]; documents: DocumentItem[] }) | null
  >(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'milestones' | 'chat' | 'documents'>('milestones');

  // Interactive Action States
  const [activeActionMilestone, setActiveActionMilestone] = useState<MilestoneSpec | null>(null);
  const [actionType, setActionType] = useState<'submit' | 'revision' | 'dispute' | null>(null);
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [deliverableFileName, setDeliverableFileName] = useState('');
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackAlert, setFeedbackAlert] = useState<string | null>(null);

  // Chat message input
  const [chatInput, setChatInput] = useState('');
  const [chatAttachment, setChatAttachment] = useState<string | null>(null);

  // Document upload modal state
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('pdf');

  useEffect(() => {
    loadContractData();
  }, [contractId]);

  const loadContractData = async () => {
    setLoading(true);
    try {
      const data = await api.getContract(contractId);
      if (data) {
        setContract(data);
      } else {
        const fallback = INITIAL_CONTRACTS.find((c) => c.id === contractId) || INITIAL_CONTRACTS[0];
        setContract({
          ...fallback,
          messages: INITIAL_MESSAGES[contractId] || [],
          documents: INITIAL_DOCUMENTS[contractId] || [],
        });
      }
    } catch (err) {
      console.warn('Failed to load contract from network, using initial dataset', err);
      const fallback = INITIAL_CONTRACTS.find((c) => c.id === contractId) || INITIAL_CONTRACTS[0];
      setContract({
        ...fallback,
        messages: INITIAL_MESSAGES[contractId] || [],
        documents: INITIAL_DOCUMENTS[contractId] || [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-600 font-medium">Loading Contract & Escrow Workspace...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Contract Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          The requested contract could not be loaded or has been archived.
        </p>
        <button
          onClick={onBackToExplore}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  const isClient = currentUser.id === contract.clientId;
  const isFreelancer = currentUser.id === contract.freelancerId;
  const isAdmin = currentUser.role === 'admin';

  // Milestone Actions Handlers
  const handleFundMilestone = async (mId: string) => {
    setIsProcessing(true);
    try {
      await api.fundMilestone(contract.id, mId);
      setFeedbackAlert('Escrow funded successfully! Funds are secured and work may begin.');
      await loadContractData();
    } catch (err) {
      console.error(err);
      setFeedbackAlert('Failed to fund milestone.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitMilestone = async () => {
    if (!activeActionMilestone) return;
    setIsProcessing(true);
    try {
      await api.submitMilestone(contract.id, activeActionMilestone.id, {
        notes: deliverableNotes || 'Deliverables submitted for milestone review',
        files: deliverableFileName ? [deliverableFileName] : ['Deliverables-Package.zip'],
      });

      // Automatically add to document vault
      if (deliverableFileName) {
        await api.uploadDocument(contract.id, {
          name: deliverableFileName,
          type: 'zip',
          size: '5.2 MB',
          uploadedBy: currentUser.name,
          uploaderRole: currentUser.role,
          milestoneId: activeActionMilestone.id,
        });
      }

      setFeedbackAlert('Deliverables submitted! Client notified to review and release escrow payment.');
      setActiveActionMilestone(null);
      setActionType(null);
      setDeliverableNotes('');
      setDeliverableFileName('');
      await loadContractData();
    } catch (err) {
      console.error(err);
      setFeedbackAlert('Failed to submit milestone.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveMilestone = async (mId: string) => {
    setIsProcessing(true);
    try {
      await api.approveMilestone(contract.id, mId);
      setFeedbackAlert('Milestone approved! Escrow payment released to the freelancer balance.');
      await loadContractData();
    } catch (err) {
      console.error(err);
      setFeedbackAlert('Failed to approve milestone.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!activeActionMilestone) return;
    setIsProcessing(true);
    try {
      await api.requestRevision(contract.id, activeActionMilestone.id, revisionFeedback);
      setFeedbackAlert('Revision request sent to freelancer with your notes.');
      setActiveActionMilestone(null);
      setActionType(null);
      setRevisionFeedback('');
      await loadContractData();
    } catch (err) {
      console.error(err);
      setFeedbackAlert('Failed to request revision.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (!activeActionMilestone) return;
    setIsProcessing(true);
    try {
      const disputeRes = await api.raiseDispute({
        contractId: contract.id,
        milestoneId: activeActionMilestone.id,
        reason: disputeReason || 'Milestone Deliverable Discrepancy',
        description: disputeDescription || 'Disagreement over agreed scope or criteria.',
        raisedById: currentUser.id,
        evidence: [
          {
            title: 'Milestone Review Log',
            description: 'Transcript of communications and submitted files.',
          },
        ],
      });
      setFeedbackAlert('Dispute raised. Escrow funds are locked under Bid Forge Admin Mediation.');
      setActiveActionMilestone(null);
      setActionType(null);
      setDisputeReason('');
      setDisputeDescription('');
      await loadContractData();
      onNavigateToDispute(disputeRes.id);
    } catch (err) {
      console.error(err);
      setFeedbackAlert('Failed to raise dispute.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !chatAttachment) return;

    try {
      await api.sendMessage(contract.id, {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        text: chatInput,
        attachmentName: chatAttachment || undefined,
        attachmentSize: chatAttachment ? '2.4 MB' : undefined,
      });

      setChatInput('');
      setChatAttachment(null);
      await loadContractData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    try {
      await api.uploadDocument(contract.id, {
        name: newDocName,
        type: newDocType,
        size: '2.8 MB',
        uploadedBy: currentUser.name,
        uploaderRole: currentUser.role,
      });

      setNewDocName('');
      setIsUploadDocOpen(false);
      await loadContractData();
      setFeedbackAlert('Document successfully uploaded to project vault.');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {feedbackAlert && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackAlert}</span>
          </div>
          <button
            onClick={() => setFeedbackAlert(null)}
            className="text-emerald-600 hover:text-emerald-800 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Contract Header & Escrow Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
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
                {contract.status === 'disputed' ? 'Dispute Under Mediation' : contract.status}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
              {contract.projectTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Client:</span>
                <span className="font-semibold text-slate-900">{contract.clientName}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Freelancer:</span>
                <span className="font-semibold text-slate-900">{contract.freelancerName}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Started {new Date(contract.startDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Dispute Quick Action if active */}
          {contract.disputeId && (
            <button
              onClick={() => onNavigateToDispute(contract.disputeId)}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>View Case in Dispute Mediation Center</span>
            </button>
          )}
        </div>

        {/* Escrow Financial Ledger Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Contract Value
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              ${contract.totalAmount.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">
              {contract.milestones.length} defined milestones
            </span>
          </div>

          <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wide flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Escrow Held in Safe Custody
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                Guaranteed
              </span>
            </div>
            <div className="text-2xl font-bold text-indigo-900 mt-1">
              ${contract.escrowFunded.toLocaleString()}
            </div>
            <span className="text-[11px] text-indigo-700">
              Locked until milestone approval
            </span>
          </div>

          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
            <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
              Total Released to Freelancer
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              ${contract.escrowReleased.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-700">
              Approved milestone payments
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation: Milestones, Live Messaging, Document Repository */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveWorkspaceTab('milestones')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeWorkspaceTab === 'milestones'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Milestone Pipeline ({contract.milestones.length})</span>
        </button>

        <button
          onClick={() => setActiveWorkspaceTab('chat')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
            activeWorkspaceTab === 'chat'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Collaboration Chat</span>
          {contract.messages?.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
              {contract.messages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveWorkspaceTab('documents')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeWorkspaceTab === 'documents'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Deliverables Vault ({contract.documents?.length || 0})</span>
        </button>
      </div>

      {/* ================= TAB 1: MILESTONE PIPELINE ================= */}
      {activeWorkspaceTab === 'milestones' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Milestone Deliverables & Escrow Schedule
                </h3>
                <p className="text-xs text-slate-500">
                  Clear accountability: Client deposits funds into escrow, freelancer submits proof of work, and payments are unlocked upon verification.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {contract.milestones.map((m, idx) => {
                const isPendingFunding = m.status === 'pending_funding';
                const isFunded = m.status === 'funded';
                const isSubmitted = m.status === 'submitted';
                const isApproved = m.status === 'approved';
                const isRevisionRequested = m.status === 'revision_requested';
                const isDisputed = m.status === 'disputed';

                return (
                  <div
                    key={m.id}
                    className={`border rounded-xl p-5 transition-all ${
                      isApproved
                        ? 'bg-emerald-50/20 border-emerald-200'
                        : isDisputed
                        ? 'bg-amber-50/30 border-amber-300'
                        : isSubmitted
                        ? 'bg-indigo-50/20 border-indigo-200 ring-1 ring-indigo-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900">{m.title}</h4>

                          {/* Status Badge */}
                          {isApproved && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Approved & Paid
                            </span>
                          )}
                          {isSubmitted && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-600" />
                              Deliverable Submitted for Review
                            </span>
                          )}
                          {isFunded && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-blue-600" />
                              Funded in Escrow — In Progress
                            </span>
                          )}
                          {isPendingFunding && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                              Awaiting Escrow Deposit
                            </span>
                          )}
                          {isRevisionRequested && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">
                              Revision Requested
                            </span>
                          )}
                          {isDisputed && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              In Mediation Dispute
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>

                        {/* Deliverable Notes if submitted */}
                        {m.deliverableNotes && (
                          <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                            <span className="font-semibold text-slate-900 block mb-0.5">
                              Deliverable Submission Notes:
                            </span>
                            {m.deliverableNotes}
                            {m.deliverableFiles && m.deliverableFiles.length > 0 && (
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-indigo-600 font-medium">
                                <Paperclip className="w-3 h-3" />
                                <span>Attached: {m.deliverableFiles.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Price & Interactive Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                        <div className="text-left sm:text-right">
                          <span className="text-base font-bold text-slate-900 block">
                            ${m.amount.toLocaleString()}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Due: {m.dueDate}
                          </span>
                        </div>

                        {/* Action buttons depending on persona */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Client Funding Button */}
                          {isPendingFunding && isClient && (
                            <button
                              onClick={() => handleFundMilestone(m.id)}
                              disabled={isProcessing}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                            >
                              Fund Escrow (${m.amount.toLocaleString()})
                            </button>
                          )}

                          {/* Freelancer Submit Deliverables Button */}
                          {(isFunded || isRevisionRequested) && isFreelancer && (
                            <button
                              onClick={() => {
                                setActiveActionMilestone(m);
                                setActionType('submit');
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Submit Work</span>
                            </button>
                          )}

                          {/* Client Approval / Revision Buttons */}
                          {isSubmitted && isClient && (
                            <>
                              <button
                                onClick={() => handleApproveMilestone(m.id)}
                                disabled={isProcessing}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve & Release ${m.amount.toLocaleString()}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveActionMilestone(m);
                                  setActionType('revision');
                                }}
                                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                              >
                                Request Revision
                              </button>
                            </>
                          )}

                          {/* Raise Dispute Option */}
                          {!isApproved && !isDisputed && (
                            <button
                              onClick={() => {
                                setActiveActionMilestone(m);
                                setActionType('dispute');
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Raise Formal Dispute with Admin Mediation"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: LIVE MESSAGING ================= */}
      {activeWorkspaceTab === 'chat' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col h-[600px]">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Project Collaboration Feed</h3>
              <p className="text-xs text-slate-500">
                Direct encrypted conversation between {contract.clientName} and {contract.freelancerName}.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Workspace
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {contract.messages?.map((msg) => {
              const isSender = msg.senderId === currentUser.id;
              const isAdminMsg = msg.senderRole === 'admin';

              if (isAdminMsg) {
                return (
                  <div key={msg.id} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-950">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>{msg.senderName}</span>
                      <span className="text-[10px] text-amber-700 font-normal">
                        • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p>{msg.text}</p>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700">{msg.senderName}</span>
                    <span className="capitalize text-[10px]">({msg.senderRole})</span>
                    <span>• {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isSender
                        ? 'bg-slate-900 text-white rounded-tr-none'
                        : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    {msg.attachmentName && (
                      <div
                        className={`mt-2 p-2 rounded-lg text-[11px] flex items-center justify-between gap-3 ${
                          isSender ? 'bg-slate-800 text-slate-200' : 'bg-white border border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-semibold truncate">{msg.attachmentName}</span>
                          <span className="opacity-70 text-[10px]">({msg.attachmentSize})</span>
                        </div>
                        <span className="text-[10px] underline font-bold cursor-pointer">View</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              placeholder={`Type a message as ${currentUser.name}...`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
            <button
              type="button"
              onClick={() =>
                setChatAttachment(
                  chatAttachment ? null : 'Spring-Boot-OpenAPI-Spec-v2.yaml'
                )
              }
              className={`p-2.5 rounded-xl border text-xs transition-colors ${
                chatAttachment
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* ================= TAB 3: DELIVERABLES VAULT ================= */}
      {activeWorkspaceTab === 'documents' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Shared Deliverables & Document Vault
              </h3>
              <p className="text-xs text-slate-500">
                All uploaded specifications, pull request artifacts, and benchmark proofs tied to this contract.
              </p>
            </div>
            <button
              onClick={() => setIsUploadDocOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contract.documents?.map((doc) => (
              <div
                key={doc.id}
                className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{doc.name}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span>By {doc.uploadedBy}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      doc.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : doc.status === 'submitted'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {doc.status}
                  </span>
                  <a
                    href="#download"
                    onClick={(e) => {
                      e.preventDefault();
                      setFeedbackAlert(`Downloading ${doc.name} (simulated secure transfer)...`);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: SUBMIT DELIVERABLE ================= */}
      {actionType === 'submit' && activeActionMilestone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                Submit Deliverables for: {activeActionMilestone.title}
              </h3>
              <button
                onClick={() => setActionType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Deliverable Notes & Summary
              </label>
              <textarea
                rows={4}
                value={deliverableNotes}
                onChange={(e) => setDeliverableNotes(e.target.value)}
                placeholder="Detail what was completed, pull request URLs, test coverage metrics, or staging server access..."
                className="w-full p-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Attach Code Package or Specification
              </label>
              <input
                type="text"
                placeholder="e.g. Apex-Core-Services-PR#15.zip"
                value={deliverableFileName}
                onChange={(e) => setDeliverableFileName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setActionType(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitMilestone}
                disabled={isProcessing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                {isProcessing ? 'Submitting...' : 'Submit for Escrow Release'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REQUEST REVISION ================= */}
      {actionType === 'revision' && activeActionMilestone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                Request Revision for: {activeActionMilestone.title}
              </h3>
              <button
                onClick={() => setActionType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Feedback & Required Adjustments
              </label>
              <textarea
                rows={4}
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder="Explain clearly what requirements were not fully met according to the agreed milestone criteria..."
                className="w-full p-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setActionType(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRevision}
                disabled={isProcessing}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                {isProcessing ? 'Sending...' : 'Send Revision Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RAISE FORMAL DISPUTE ================= */}
      {actionType === 'dispute' && activeActionMilestone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Raise Dispute on: {activeActionMilestone.title}</span>
              </div>
              <button
                onClick={() => setActionType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              Raising a dispute immediately freezes milestone escrow funds (${activeActionMilestone.amount.toLocaleString()}) and transfers the case to Bid Forge Chief Arbiter Marcus Vance for binding arbitration.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Dispute Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Scope Deviation / Missed SLA / Unapproved Changes"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Case Details & Context
              </label>
              <textarea
                rows={4}
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                placeholder="Provide specific factual details, clauses from the contract, and evidence for the arbitrator..."
                className="w-full p-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setActionType(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRaiseDispute}
                disabled={isProcessing}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Submitting Case...' : 'Submit to Admin Mediation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: UPLOAD NEW DOCUMENT ================= */}
      {isUploadDocOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleUploadDocument} className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Upload to Project Vault</h3>
              <button
                type="button"
                onClick={() => setIsUploadDocOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Document Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Architecture-Diagram-v2.pdf"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Document Type
              </label>
              <select
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              >
                <option value="pdf">PDF Report / Specification</option>
                <option value="zip">ZIP Source Code Archive</option>
                <option value="sql">SQL Database Script</option>
                <option value="yaml">YAML / OpenAPI Spec</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsUploadDocOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Upload File
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
