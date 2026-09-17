import React, { useState } from 'react';
import {
  X,
  Sparkles,
  DollarSign,
  Layers,
  Plus,
  Trash2,
  AlertCircle,
  Briefcase,
  Clock,
  Award,
} from 'lucide-react';
import { UserProfile, BudgetType, ExperienceLevel, MilestoneSpec } from '../types';
import { api } from '../services/api';

interface PostProjectModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

export const PostProjectModal: React.FC<PostProjectModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Full Stack Development');
  const [budgetType, setBudgetType] = useState<BudgetType>('milestone');
  const [budgetMin, setBudgetMin] = useState(3000);
  const [budgetMax, setBudgetMax] = useState(5000);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('expert');
  const [duration, setDuration] = useState('3-4 weeks');
  const [skillsText, setSkillsText] = useState('React, TypeScript, Spring Boot, PostgreSQL, REST API');
  const [milestones, setMilestones] = useState<Array<{ title: string; description: string; amount: number }>>([
    {
      title: 'Milestone 1: Architecture & API Specifications',
      description: 'System design, database schema, and OpenAPI documentation',
      amount: 1500,
    },
    {
      title: 'Milestone 2: Core Development & Integration',
      description: 'Main feature implementation and unit testing suite',
      amount: 2500,
    },
    {
      title: 'Milestone 3: Final Acceptance & Deployment',
      description: 'Staging deployment, documentation, and handover',
      amount: 1000,
    },
  ]);

  // AI Assistant States
  const [aiBriefIdea, setAiBriefIdea] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        title: `Milestone ${milestones.length + 1}: Implementation Stage`,
        description: 'Deliverable specification',
        amount: 1000,
      },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (
    index: number,
    field: 'title' | 'description' | 'amount',
    val: string | number
  ) => {
    const updated = [...milestones];
    updated[index] = {
      ...updated[index],
      [field]: field === 'amount' ? Number(val) : val,
    };
    setMilestones(updated);
  };

  const handleGenerateAISpec = async () => {
    if (!aiBriefIdea.trim()) {
      setError('Please type a brief idea for the AI to flesh out.');
      return;
    }

    setIsGeneratingAI(true);
    setError(null);

    try {
      const result = await api.generateProjectSpecAI({
        briefIdea: aiBriefIdea,
        industry: category,
        estimatedBudget: `$${budgetMin} - $${budgetMax}`,
      });

      if (result.title) setTitle(result.title);
      if (result.detailedDescription) setDescription(result.detailedDescription);
      if (result.suggestedCategory) setCategory(result.suggestedCategory);
      if (result.suggestedSkills && result.suggestedSkills.length > 0) {
        setSkillsText(result.suggestedSkills.join(', '));
      }
      if (result.suggestedBudgetMin) setBudgetMin(result.suggestedBudgetMin);
      if (result.suggestedBudgetMax) setBudgetMax(result.suggestedBudgetMax);
      if (result.suggestedMilestones && result.suggestedMilestones.length > 0) {
        setMilestones(
          result.suggestedMilestones.map((m) => ({
            title: m.title,
            description: m.description,
            amount: m.amount,
          }))
        );
      }
    } catch (err: any) {
      console.error(err);
      setError('Could not auto-generate specification. You can still input manually.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please fill in title and description.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const skills = skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const formattedMilestones: MilestoneSpec[] = milestones.map((m, idx) => ({
        id: `m-${Date.now()}-${idx + 1}`,
        title: m.title,
        description: m.description,
        amount: m.amount,
        dueDate: new Date(Date.now() + (idx + 1) * 10 * 86400000)
          .toISOString()
          .split('T')[0],
        status: 'pending_funding',
      }));

      await api.createProject({
        title,
        description,
        category,
        clientId: currentUser.id,
        clientName: currentUser.name,
        budgetType,
        budgetMin: Number(budgetMin),
        budgetMax: Number(budgetMax),
        experienceLevel,
        duration,
        skills,
        initialMilestones: formattedMilestones,
      });

      onProjectCreated();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Failed to create project listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">
              New Listing
            </span>
            <h2 className="text-lg font-bold text-white leading-tight">
              Post a Project on Bid Forge
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Project Scope Generator */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-amber-50/60 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-indigo-950 font-semibold text-sm mb-1">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>AI Scope & Milestone Generator</span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Describe your project concept in a sentence or two, and Gemini will structure the complete specification, acceptance criteria, recommended skill tags, and balanced milestone schedule.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., High-throughput microservice in Spring Boot with React admin portal and Stripe escrow payments..."
                value={aiBriefIdea}
                onChange={(e) => setAiBriefIdea(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
              <button
                type="button"
                onClick={handleGenerateAISpec}
                disabled={isGeneratingAI}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAI ? 'Generating...' : 'Auto-Generate'}</span>
              </button>
            </div>
          </div>

          {/* Project Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Project Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Enterprise Spring Boot & React Analytics Portal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          {/* Category & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
              >
                <option value="Full Stack Development">Full Stack Development</option>
                <option value="Backend & FinTech">Backend & FinTech</option>
                <option value="Security & DevOps">Security & DevOps</option>
                <option value="DevOps & Cloud">DevOps & Cloud</option>
                <option value="AI & Machine Learning">AI & Machine Learning</option>
                <option value="Mobile App Development">Mobile App Development</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Experience Level Required
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
              >
                <option value="expert">Expert (Architect / Senior Lead)</option>
                <option value="intermediate">Intermediate (Mid-level Developer)</option>
                <option value="entry">Entry Level</option>
              </select>
            </div>
          </div>

          {/* Budget Range & Contract Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Contract Type
              </label>
              <select
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value as BudgetType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
              >
                <option value="milestone">Milestone-Based Escrow</option>
                <option value="fixed">Fixed Price</option>
                <option value="hourly">Hourly Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Minimum Budget ($)
              </label>
              <input
                type="number"
                required
                min={100}
                value={budgetMin}
                onChange={(e) => setBudgetMin(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Maximum Budget ($)
              </label>
              <input
                type="number"
                required
                min={100}
                value={budgetMax}
                onChange={(e) => setBudgetMax(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Project Description & Requirements
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a comprehensive project breakdown, deliverables, test criteria, and architecture preferences..."
              className="w-full p-3 border border-slate-300 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          {/* Skills Required */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Skills Required (comma-separated)
            </label>
            <input
              type="text"
              required
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="Spring Boot, React, TypeScript, Docker, PostgreSQL"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          {/* Expected Milestones Setup */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Milestones & Escrow Allocation
              </label>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Milestone</span>
              </button>
            </div>

            <div className="space-y-2">
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400 w-5 text-center">{idx + 1}</span>
                    <input
                      type="text"
                      required
                      placeholder="Milestone Title"
                      value={m.title}
                      onChange={(e) => handleMilestoneChange(idx, 'title', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden"
                    />
                    <div className="w-28 relative">
                      <span className="absolute left-2 top-1.5 text-slate-400">$</span>
                      <input
                        type="number"
                        required
                        min={50}
                        placeholder="Amount"
                        value={m.amount}
                        onChange={(e) => handleMilestoneChange(idx, 'amount', e.target.value)}
                        className="w-full pl-5 pr-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-hidden"
                      />
                    </div>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(idx)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Deliverable specifications and acceptance criteria"
                    value={m.description}
                    onChange={(e) => handleMilestoneChange(idx, 'description', e.target.value)}
                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Publishing Listing...</span>
              ) : (
                <span>Publish Project Listing</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
