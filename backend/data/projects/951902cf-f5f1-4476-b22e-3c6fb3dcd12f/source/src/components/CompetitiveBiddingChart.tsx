import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Bid, Project } from '../types';
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Layers,
  Award,
  BarChart3,
  Sliders,
  Sparkles,
  CheckCircle2,
  Info,
} from 'lucide-react';

export type ExperienceTier = 'Entry' | 'Intermediate' | 'Expert';

export interface BidderAnalysis {
  bid: Bid;
  tier: ExperienceTier;
  tierLabel: string;
  tierColor: string;
  tierBg: string;
  tierBorder: string;
}

export function classifyExperience(bid: Bid): {
  tier: ExperienceTier;
  tierLabel: string;
  tierColor: string;
  tierBg: string;
  tierBorder: string;
} {
  const title = (bid.freelancerTitle || '').toLowerCase();
  const jobs = bid.freelancerCompletedJobs || 0;
  const rating = bid.freelancerRating || 0;

  if (
    title.includes('principal') ||
    title.includes('lead') ||
    title.includes('senior') ||
    title.includes('architect') ||
    title.includes('ph.d') ||
    title.includes('staff') ||
    jobs >= 25 ||
    (rating >= 4.93 && jobs >= 15)
  ) {
    return {
      tier: 'Expert',
      tierLabel: 'Senior / Expert (5+ yrs)',
      tierColor: '#6366f1', // Indigo
      tierBg: 'rgba(99, 102, 241, 0.1)',
      tierBorder: 'rgba(99, 102, 241, 0.4)',
    };
  }

  if (
    title.includes('specialist') ||
    title.includes('mid') ||
    title.includes('consultant') ||
    title.includes('engineer') ||
    jobs >= 8 ||
    rating >= 4.8
  ) {
    return {
      tier: 'Intermediate',
      tierLabel: 'Mid-Level / Specialist (2-5 yrs)',
      tierColor: '#0284c7', // Sky
      tierBg: 'rgba(2, 132, 199, 0.1)',
      tierBorder: 'rgba(2, 132, 199, 0.4)',
    };
  }

  return {
    tier: 'Entry',
    tierLabel: 'Emerging / Entry (1-2 yrs)',
    tierColor: '#d97706', // Amber
    tierBg: 'rgba(217, 119, 6, 0.1)',
    tierBorder: 'rgba(217, 119, 6, 0.4)',
  };
}

interface CompetitiveBiddingChartProps {
  project: Project;
  bids: Bid[];
}

export const CompetitiveBiddingChart: React.FC<CompetitiveBiddingChartProps> = ({
  project,
  bids,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 650,
    height: 260,
  });
  const [activeTab, setActiveTab] = useState<'distribution' | 'experience'>('distribution');
  const [hoveredBid, setHoveredBid] = useState<{
    bid: Bid;
    analysis: ReturnType<typeof classifyExperience>;
    x: number;
    y: number;
  } | null>(null);
  const [selectedTierFilter, setSelectedTierFilter] = useState<ExperienceTier | 'all'>('all');

  // Classified bids with experience tiers
  const analyzedBids: BidderAnalysis[] = useMemo(() => {
    return bids.map((b) => {
      const classification = classifyExperience(b);
      return {
        bid: b,
        ...classification,
      };
    });
  }, [bids]);

  // Aggregate Key Statistics
  const stats = useMemo(() => {
    if (bids.length === 0) {
      const clientMid = Math.round((project.budgetMin + project.budgetMax) / 2);
      return {
        count: 0,
        avgBid: project.avgBidAmount || clientMid,
        minBid: project.budgetMin,
        maxBid: project.budgetMax,
        medianBid: clientMid,
        avgDays: 21,
        tierCounts: { Expert: 0, Intermediate: 0, Entry: 0 },
        tierPercentages: { Expert: 0, Intermediate: 0, Entry: 0 },
        tierAvgBids: { Expert: 0, Intermediate: 0, Entry: 0 },
        diffVsBudgetMid: 0,
      };
    }

    const amounts = bids.map((b) => b.bidAmount).sort((a, b) => a - b);
    const sum = amounts.reduce((acc, val) => acc + val, 0);
    const avgBid = Math.round(sum / bids.length);
    const minBid = amounts[0];
    const maxBid = amounts[amounts.length - 1];
    const medianBid =
      amounts.length % 2 === 0
        ? Math.round((amounts[amounts.length / 2 - 1] + amounts[amounts.length / 2]) / 2)
        : amounts[Math.floor(amounts.length / 2)];

    const avgDays = Math.round(
      bids.reduce((acc, b) => acc + (b.estimatedDeliveryDays || 20), 0) / bids.length
    );

    const clientMid = (project.budgetMin + project.budgetMax) / 2;
    const diffVsBudgetMid = Math.round(((avgBid - clientMid) / clientMid) * 100);

    const tierCounts = { Expert: 0, Intermediate: 0, Entry: 0 };
    const tierSums = { Expert: 0, Intermediate: 0, Entry: 0 };

    analyzedBids.forEach((ab) => {
      tierCounts[ab.tier] += 1;
      tierSums[ab.tier] += ab.bid.bidAmount;
    });

    const tierPercentages = {
      Expert: Math.round((tierCounts.Expert / bids.length) * 100) || 0,
      Intermediate: Math.round((tierCounts.Intermediate / bids.length) * 100) || 0,
      Entry: Math.round((tierCounts.Entry / bids.length) * 100) || 0,
    };

    const tierAvgBids = {
      Expert: tierCounts.Expert > 0 ? Math.round(tierSums.Expert / tierCounts.Expert) : 0,
      Intermediate:
        tierCounts.Intermediate > 0 ? Math.round(tierSums.Intermediate / tierCounts.Intermediate) : 0,
      Entry: tierCounts.Entry > 0 ? Math.round(tierSums.Entry / tierCounts.Entry) : 0,
    };

    return {
      count: bids.length,
      avgBid,
      minBid,
      maxBid,
      medianBid,
      avgDays,
      tierCounts,
      tierPercentages,
      tierAvgBids,
      diffVsBudgetMid,
    };
  }, [bids, project.budgetMin, project.budgetMax, project.avgBidAmount, analyzedBids]);

  // Handle Dynamic ResizeObserver for responsive SVG
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setDimensions({
            width: Math.max(rect.width, 320),
            height: activeTab === 'distribution' ? 260 : 250,
          });
        }
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [activeTab]);

  // Render D3 Chart
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean slate for crisp rerender

    const { width, height } = dimensions;
    const margin = { top: 32, right: 36, bottom: 42, left: 100 };
    const innerWidth = Math.max(width - margin.left - margin.right, 100);
    const innerHeight = Math.max(height - margin.top - margin.bottom, 80);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // =========================================================================
    // VIEW 1: PRICE DISTRIBUTION & BUDGET BENCHMARK
    // =========================================================================
    if (activeTab === 'distribution') {
      // Calculate domain encompassing both project budget range and all bids
      const allValues = [
        project.budgetMin,
        project.budgetMax,
        ...bids.map((b) => b.bidAmount),
      ];
      const dataMin = Math.min(...allValues);
      const dataMax = Math.max(...allValues);
      const padding = (dataMax - dataMin) * 0.08 || 500;
      const xDomain = [Math.max(0, dataMin - padding), dataMax + padding];

      const xScale = d3.scaleLinear().domain(xDomain).range([0, innerWidth]).nice();

      // Lanes by Experience Tier
      const tierLanes: ExperienceTier[] = ['Expert', 'Intermediate', 'Entry'];
      const yScale = d3
        .scalePoint<ExperienceTier>()
        .domain(tierLanes)
        .range([innerHeight * 0.18, innerHeight * 0.88])
        .padding(0.2);

      // Background Client Budget Shaded Region
      const budgetX1 = xScale(project.budgetMin);
      const budgetX2 = xScale(project.budgetMax);

      const budgetBand = g.append('g').attr('class', 'budget-band');

      // Shaded area
      budgetBand
        .append('rect')
        .attr('x', Math.min(budgetX1, budgetX2))
        .attr('y', 0)
        .attr('width', Math.max(Math.abs(budgetX2 - budgetX1), 2))
        .attr('height', innerHeight)
        .attr('fill', '#f1f5f9')
        .attr('rx', 6)
        .attr('opacity', 0.85);

      // Client budget boundary borders
      budgetBand
        .append('line')
        .attr('x1', budgetX1)
        .attr('x2', budgetX1)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,3');

      budgetBand
        .append('line')
        .attr('x1', budgetX2)
        .attr('x2', budgetX2)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,3');

      // Budget Range Label Badge at Top
      budgetBand
        .append('text')
        .attr('x', (budgetX1 + budgetX2) / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', '#475569')
        .text(`Client Budget Range: $${project.budgetMin.toLocaleString()} - $${project.budgetMax.toLocaleString()}`);

      // Gridlines
      const xAxisGrid = d3
        .axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickFormat(() => '')
        .ticks(5);

      g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxisGrid)
        .attr('stroke', '#f1f5f9')
        .attr('stroke-opacity', 0.7)
        .selectAll('line')
        .attr('stroke', '#e2e8f0');

      // Experience Tier Horizontal Guideline Tracks
      tierLanes.forEach((tier) => {
        const yPos = yScale(tier) || 0;
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', yPos)
          .attr('y2', yPos)
          .attr('stroke', '#e2e8f0')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2');
      });

      // Average Bid Amount Reference Line
      if (stats.avgBid > 0 && bids.length > 0) {
        const avgX = xScale(stats.avgBid);

        const avgLineGroup = g.append('g').attr('class', 'avg-bid-line');

        avgLineGroup
          .append('line')
          .attr('x1', avgX)
          .attr('x2', avgX)
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('stroke', '#4f46e5')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,4');

        // Avg marker pill at bottom
        avgLineGroup
          .append('rect')
          .attr('x', avgX - 38)
          .attr('y', innerHeight + 20)
          .attr('width', 76)
          .attr('height', 18)
          .attr('rx', 9)
          .attr('fill', '#4f46e5');

        avgLineGroup
          .append('text')
          .attr('x', avgX)
          .attr('y', innerHeight + 32)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('fill', '#ffffff')
          .text(`Avg: $${stats.avgBid.toLocaleString()}`);
      }

      // Render Y-Axis Tier Labels
      const yAxisLabels = g.append('g').attr('class', 'y-axis-labels');
      tierLanes.forEach((tier) => {
        const yPos = yScale(tier) || 0;
        const count = stats.tierCounts[tier];
        const color =
          tier === 'Expert' ? '#4338ca' : tier === 'Intermediate' ? '#0369a1' : '#b45309';

        const labelGroup = yAxisLabels
          .append('g')
          .attr('transform', `translate(-12, ${yPos})`)
          .style('cursor', 'pointer')
          .on('click', () => {
            setSelectedTierFilter((prev) => (prev === tier ? 'all' : tier));
          });

        labelGroup
          .append('text')
          .attr('text-anchor', 'end')
          .attr('y', -3)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .attr('fill', color)
          .text(tier);

        labelGroup
          .append('text')
          .attr('text-anchor', 'end')
          .attr('y', 11)
          .attr('font-size', '9px')
          .attr('font-weight', '500')
          .attr('fill', '#64748b')
          .text(`${count} bidder${count === 1 ? '' : 's'}`);
      });

      // Bottom X Axis (Currency)
      const xAxis = d3
        .axisBottom(xScale)
        .ticks(Math.max(3, Math.floor(innerWidth / 90)))
        .tickFormat((d) => `$${Number(d).toLocaleString()}`);

      const xAxisGroup = g
        .append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis);

      xAxisGroup.select('.domain').attr('stroke', '#cbd5e1');
      xAxisGroup
        .selectAll('text')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', '#64748b')
        .attr('dy', '0.8em');

      // Plot Bids as Interactive Circles / Nodes
      const dotsGroup = g.append('g').attr('class', 'bids-dots');

      analyzedBids.forEach((ab, idx) => {
        const isDimmed = selectedTierFilter !== 'all' && selectedTierFilter !== ab.tier;
        const xPos = xScale(ab.bid.bidAmount);
        const yBase = yScale(ab.tier) || innerHeight / 2;

        // Micro-offset for bidders in the same tier with similar bid amounts to avoid exact overlap
        const sameTierBids = analyzedBids.filter((b) => b.tier === ab.tier);
        const rankInTier = sameTierBids.indexOf(ab);
        const yOffset =
          sameTierBids.length > 1 ? ((rankInTier - (sameTierBids.length - 1) / 2) * 12) : 0;
        const yPos = yBase + yOffset;

        const node = dotsGroup
          .append('g')
          .attr('class', 'bid-node')
          .attr('opacity', isDimmed ? 0.25 : 1)
          .style('cursor', 'pointer');

        // Outer Glow / Ring
        node
          .append('circle')
          .attr('cx', xPos)
          .attr('cy', yPos)
          .attr('r', 11)
          .attr('fill', ab.tierBg)
          .attr('stroke', ab.tierColor)
          .attr('stroke-width', 1.5);

        // Core Center Dot
        node
          .append('circle')
          .attr('cx', xPos)
          .attr('cy', yPos)
          .attr('r', 5)
          .attr('fill', ab.tierColor);

        // Dollar Amount Tooltip Tag above node
        node
          .append('text')
          .attr('x', xPos)
          .attr('y', yPos - 14)
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('font-weight', '700')
          .attr('fill', '#1e293b')
          .text(`$${ab.bid.bidAmount.toLocaleString()}`);

        // Mouse Interactivity
        node
          .on('mouseenter', (event) => {
            const [mx, my] = d3.pointer(event, containerRef.current);
            setHoveredBid({
              bid: ab.bid,
              analysis: ab,
              x: mx,
              y: my,
            });
            d3.select(event.currentTarget)
              .select('circle')
              .transition()
              .duration(150)
              .attr('r', 15)
              .attr('stroke-width', 2.5);
          })
          .on('mouseleave', (event) => {
            setHoveredBid(null);
            d3.select(event.currentTarget)
              .select('circle')
              .transition()
              .duration(150)
              .attr('r', 11)
              .attr('stroke-width', 1.5);
          });
      });
    }

    // =========================================================================
    // VIEW 2: EXPERIENCE LEVEL SPECTRUM & COMPARATIVE BARS
    // =========================================================================
    if (activeTab === 'experience') {
      const tierData: Array<{
        tier: ExperienceTier;
        count: number;
        avgBid: number;
        percentage: number;
        color: string;
        bg: string;
        label: string;
      }> = [
        {
          tier: 'Expert',
          count: stats.tierCounts.Expert,
          avgBid: stats.tierAvgBids.Expert,
          percentage: stats.tierPercentages.Expert,
          color: '#6366f1',
          bg: 'rgba(99, 102, 241, 0.15)',
          label: 'Senior / Expert (5+ yrs)',
        },
        {
          tier: 'Intermediate',
          count: stats.tierCounts.Intermediate,
          avgBid: stats.tierAvgBids.Intermediate,
          percentage: stats.tierPercentages.Intermediate,
          color: '#0284c7',
          bg: 'rgba(2, 132, 199, 0.15)',
          label: 'Mid-Level / Specialist (2-5 yrs)',
        },
        {
          tier: 'Entry',
          count: stats.tierCounts.Entry,
          avgBid: stats.tierAvgBids.Entry,
          percentage: stats.tierPercentages.Entry,
          color: '#d97706',
          bg: 'rgba(217, 119, 6, 0.15)',
          label: 'Emerging / Entry (1-2 yrs)',
        },
      ];

      const maxCount = Math.max(...tierData.map((d) => d.count), 1);
      const yScale = d3
        .scaleBand()
        .domain(tierData.map((d) => d.tier))
        .range([0, innerHeight])
        .padding(0.32);

      const xCountScale = d3
        .scaleLinear()
        .domain([0, maxCount])
        .range([0, innerWidth * 0.48]);

      // Left Section: Bidders Volume Bars
      tierData.forEach((d) => {
        const yPos = yScale(d.tier) || 0;
        const barHeight = yScale.bandwidth();
        const barWidth = xCountScale(d.count);

        const row = g.append('g').attr('class', `tier-row-${d.tier}`);

        // Background Track
        row
          .append('rect')
          .attr('x', 0)
          .attr('y', yPos)
          .attr('width', innerWidth * 0.48)
          .attr('height', barHeight)
          .attr('fill', '#f8fafc')
          .attr('rx', 6);

        // Filled Volume Bar
        row
          .append('rect')
          .attr('x', 0)
          .attr('y', yPos)
          .attr('width', Math.max(barWidth, 6))
          .attr('height', barHeight)
          .attr('fill', d.color)
          .attr('rx', 6)
          .attr('opacity', 0.85);

        // Tier Title & Share
        row
          .append('text')
          .attr('x', 10)
          .attr('y', yPos + barHeight / 2 + 4)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .attr('fill', barWidth > 60 ? '#ffffff' : '#1e293b')
          .text(`${d.tier} (${d.count}) • ${d.percentage}%`);

        // Right Section: Tier Average Bid Pill Card
        const rightX = innerWidth * 0.54;
        const cardWidth = innerWidth * 0.46;

        const statCard = row
          .append('g')
          .attr('transform', `translate(${rightX}, ${yPos})`);

        statCard
          .append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', cardWidth)
          .attr('height', barHeight)
          .attr('fill', d.bg)
          .attr('stroke', d.color)
          .attr('stroke-width', 1)
          .attr('rx', 6);

        statCard
          .append('text')
          .attr('x', 12)
          .attr('y', barHeight / 2 - 3)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('fill', '#475569')
          .text('Avg Tier Bid:');

        statCard
          .append('text')
          .attr('x', 12)
          .attr('y', barHeight / 2 + 11)
          .attr('font-size', '13px')
          .attr('font-weight', '800')
          .attr('fill', d.color)
          .text(d.avgBid > 0 ? `$${d.avgBid.toLocaleString()}` : 'No bids yet');

        // Difference from Client Midpoint
        if (d.avgBid > 0) {
          const clientMid = (project.budgetMin + project.budgetMax) / 2;
          const diff = Math.round(((d.avgBid - clientMid) / clientMid) * 100);
          const diffLabel =
            diff === 0 ? 'Exact Budget' : diff > 0 ? `+${diff}% vs target` : `${diff}% vs target`;

          statCard
            .append('text')
            .attr('x', cardWidth - 12)
            .attr('y', barHeight / 2 + 4)
            .attr('text-anchor', 'end')
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .attr('fill', diff > 0 ? '#b45309' : '#059669')
            .text(diffLabel);
        }
      });
    }
  }, [dimensions, activeTab, analyzedBids, project, stats, selectedTierFilter, bids]);

  return (
    <div
      id="competitive-bidding-analytics"
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4"
    >
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Competitive Bidding & Market Intelligence
              </h3>
              <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                D3 Visual Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live proposal pricing benchmarks, market spread, and bidder experience distribution.
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('distribution')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'distribution'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Price Distribution</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('experience')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'experience'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Experience Spectrum</span>
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Average Bid Card */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Average Bid Amount
          </span>
          <div className="mt-1">
            <span className="text-lg font-extrabold text-indigo-700 block">
              ${stats.avgBid.toLocaleString()}
            </span>
            <span
              className={`text-[10px] font-semibold flex items-center gap-1 ${
                stats.diffVsBudgetMid > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {stats.diffVsBudgetMid === 0
                ? 'Matches Client Midpoint'
                : `${Math.abs(stats.diffVsBudgetMid)}% ${
                    stats.diffVsBudgetMid > 0 ? 'above' : 'below'
                  } budget midpoint`}
            </span>
          </div>
        </div>

        {/* Price Spread Range */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Proposal Price Spread
          </span>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-900 block">
              ${stats.minBid.toLocaleString()} - ${stats.maxBid.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Spread: ${(stats.maxBid - stats.minBid).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Experience Spectrum */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Experience Tier Mix
          </span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-xs font-bold text-indigo-700">
              {stats.tierCounts.Expert} Sr
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-sky-700">
              {stats.tierCounts.Intermediate} Mid
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-bold text-amber-700">
              {stats.tierCounts.Entry} Jr
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            {stats.tierPercentages.Expert}% Senior/Expert Share
          </span>
        </div>

        {/* Consensus Timeline */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Delivery Consensus
          </span>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-900 block">
              {stats.avgDays} Days Avg
            </span>
            <span className="text-[10px] text-slate-500">
              Across {bids.length} active proposal{bids.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* D3 SVG Canvas Container */}
      <div
        ref={containerRef}
        className="relative bg-slate-50/60 border border-slate-200/80 rounded-xl p-3 overflow-hidden"
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto overflow-visible select-none"
        />

        {/* Interactive React Tooltip for Precision Rendering */}
        {hoveredBid && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900 text-white rounded-xl p-3 shadow-xl border border-slate-700 text-xs w-64 animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: Math.min(Math.max(hoveredBid.x - 120, 10), dimensions.width - 270),
              top: Math.max(hoveredBid.y - 120, 10),
            }}
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <img
                src={hoveredBid.bid.freelancerAvatar}
                alt={hoveredBid.bid.freelancerName}
                className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
              />
              <div className="overflow-hidden">
                <div className="font-bold text-white truncate">
                  {hoveredBid.bid.freelancerName}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {hoveredBid.bid.freelancerTitle}
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Bid Amount:</span>
                <span className="font-bold text-amber-400">
                  ${hoveredBid.bid.bidAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Experience Tier:</span>
                <span className="font-semibold text-indigo-300">
                  {hoveredBid.analysis.tier} Level
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Est. Timeline:</span>
                <span className="font-medium text-slate-200">
                  {hoveredBid.bid.estimatedDeliveryDays} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Milestones:</span>
                <span className="font-medium text-slate-200">
                  {hoveredBid.bid.proposedMilestones?.length || 0} stages proposed
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px]">
                <span className="text-slate-400">Track Record:</span>
                <span className="text-emerald-400 font-semibold">
                  ★ {hoveredBid.bid.freelancerRating.toFixed(2)} • {hoveredBid.bid.freelancerCompletedJobs} jobs
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Interactive Filter Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-1">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase">
            Bidders Legend:
          </span>

          <button
            type="button"
            onClick={() => setSelectedTierFilter((prev) => (prev === 'Expert' ? 'all' : 'Expert'))}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold transition-all ${
              selectedTierFilter === 'Expert'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Senior / Expert ({stats.tierCounts.Expert})</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setSelectedTierFilter((prev) => (prev === 'Intermediate' ? 'all' : 'Intermediate'))
            }
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold transition-all ${
              selectedTierFilter === 'Intermediate'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>Mid-Level / Specialist ({stats.tierCounts.Intermediate})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTierFilter((prev) => (prev === 'Entry' ? 'all' : 'Entry'))}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold transition-all ${
              selectedTierFilter === 'Entry'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Emerging / Entry ({stats.tierCounts.Entry})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-block w-3 h-3 rounded bg-slate-200 border border-slate-300" />
          <span>Client Target Budget Window</span>
        </div>
      </div>
    </div>
  );
};
