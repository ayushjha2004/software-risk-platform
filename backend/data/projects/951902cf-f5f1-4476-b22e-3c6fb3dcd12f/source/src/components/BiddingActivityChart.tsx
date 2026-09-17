import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Bid, Project } from '../types';
import {
  TrendingUp,
  Flame,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface BiddingActivityChartProps {
  project: Project;
  bids: Bid[];
}

interface DailyBidData {
  dateKey: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Sep 05"
  weekday: string; // e.g. "Mon"
  fullDate: string; // formatted date
  bidsCount: number;
  cumulativeBids: number;
  isToday: boolean;
}

export const BiddingActivityChart: React.FC<BiddingActivityChartProps> = ({
  project,
  bids,
}) => {
  // Compute daily bid counts over the last 7 days
  const { chartData, metrics, competitionLevel } = useMemo(() => {
    // Determine the reference "now" date based on the latest bid or project date or current time
    let referenceDate = new Date();
    // If bids have dates newer or project createdAt is known, ensure we cover the active range
    const allDates = [
      ...bids.map((b) => new Date(b.createdAt).getTime()).filter((t) => !isNaN(t)),
      new Date(project.createdAt).getTime(),
    ].filter((t) => !isNaN(t));

    if (allDates.length > 0) {
      const maxBidTime = Math.max(...allDates);
      // If referenceDate is behind or far ahead, anchor to maxBidTime or current time
      const nowTime = referenceDate.getTime();
      if (maxBidTime > nowTime || Math.abs(nowTime - maxBidTime) > 30 * 24 * 60 * 60 * 1000) {
        referenceDate = new Date(maxBidTime);
      }
    }

    // Build the 7 days array ending at referenceDate
    const days: DailyBidData[] = [];
    const dayMap = new Map<string, number>();

    // Map each bid to YYYY-MM-DD
    bids.forEach((b) => {
      if (!b.createdAt) return;
      const d = new Date(b.createdAt);
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    });

    let cumulative = 0;
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(referenceDate);
      targetDate.setDate(targetDate.getDate() - i);
      const key = targetDate.toISOString().slice(0, 10);
      const count = dayMap.get(key) || 0;
      cumulative += count;

      const monthName = targetDate.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = targetDate.getDate();
      const weekdayStr = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

      days.push({
        dateKey: key,
        dayLabel: `${monthName} ${dayNum}`,
        weekday: weekdayStr,
        fullDate: targetDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        bidsCount: count,
        cumulativeBids: cumulative,
        isToday: i === 0,
      });
    }

    // Compute key analytics
    const total7DayBids = days.reduce((sum, d) => sum + d.bidsCount, 0);
    const avgBidsPerDay = (total7DayBids / 7).toFixed(1);

    let peakDay = days[0];
    days.forEach((d) => {
      if (d.bidsCount > peakDay.bidsCount) {
        peakDay = d;
      }
    });

    // Recent momentum (last 48 hours vs previous days)
    const recent48h = days.slice(5).reduce((sum, d) => sum + d.bidsCount, 0);
    const prior5Days = days.slice(0, 5).reduce((sum, d) => sum + d.bidsCount, 0);
    const hasMomentum = recent48h >= 2 || (total7DayBids > 0 && recent48h > prior5Days / 2.5);

    // Competition Level calculation
    let level: {
      title: string;
      badgeClass: string;
      barClass: string;
      desc: string;
      advice: string;
      color: string;
    };

    if (total7DayBids >= 6 || bids.length >= 7) {
      level = {
        title: 'High Competition',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        barClass: '#e11d48',
        desc: 'Proposals are arriving rapidly. High interest and aggressive bidding from senior specialists.',
        advice: 'Highlight specialized domain certifications and concrete milestone deliverables to stand out.',
        color: '#e11d48',
      };
    } else if (total7DayBids >= 3 || bids.length >= 3) {
      level = {
        title: 'Moderate Competition',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        barClass: '#4f46e5',
        desc: 'Healthy proposal activity with focused bids within target budget ranges.',
        advice: 'Competitive pricing and a well-structured milestone payment breakdown can win this contract.',
        color: '#4f46e5',
      };
    } else {
      level = {
        title: 'Early Stage / Low Competition',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barClass: '#059669',
        desc: 'Few proposals received so far. Early applicant advantage for prompt and qualified bidders.',
        advice: 'Submit your tailored proposal now while client attention is high and competition is minimal.',
        color: '#059669',
      };
    }

    return {
      chartData: days,
      metrics: {
        total7DayBids,
        avgBidsPerDay,
        peakDay,
        hasMomentum,
        recent48h,
      },
      competitionLevel: level,
    };
  }, [project, bids]);

  const maxVal = Math.max(...chartData.map((d) => d.bidsCount), 4);
  const yTicks = Array.from({ length: maxVal + 1 }, (_, i) => i);

  return (
    <div
      id="bidding-activity-graph-container"
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4"
    >
      {/* Header & Competition Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Bidding Activity & Competition Gauge</span>
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${competitionLevel.badgeClass}`}
            >
              {competitionLevel.title}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily distribution of submitted proposals over the last 7 days to evaluate submission timing and competition velocity
          </p>
        </div>

        {/* Momentum indicator */}
        {metrics.hasMomentum ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold shrink-0 self-start sm:self-auto">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Active Momentum ({metrics.recent48h} bids in 48h)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium shrink-0 self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Steady Flow ({metrics.avgBidsPerDay} bids/day)</span>
          </div>
        )}
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
            7-Day Bids Received
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-bold text-slate-900">{metrics.total7DayBids}</span>
            <span className="text-xs text-slate-500">of {bids.length} total</span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
            Average Velocity
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-bold text-indigo-700">{metrics.avgBidsPerDay}</span>
            <span className="text-xs text-slate-500">bids / day</span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
            Peak Activity Day
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-slate-900 truncate">
              {metrics.peakDay.bidsCount > 0 ? metrics.peakDay.dayLabel : 'No bids yet'}
            </span>
            {metrics.peakDay.bidsCount > 0 && (
              <span className="text-xs text-indigo-600 font-semibold">
                ({metrics.peakDay.bidsCount} bids)
              </span>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
            Freelancer Strategy
          </span>
          <span className="text-xs font-bold text-slate-800 mt-1 block truncate">
            {competitionLevel.title.split(' ')[0]} Competition
          </span>
        </div>
      </div>

      {/* Visual Graph with Recharts */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2 px-1">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Daily Proposals Velocity (Last 7 Days)</span>
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block" />
              <span>Daily Bids</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1 bg-amber-500 inline-block" />
              <span>Cumulative</span>
            </span>
          </div>
        </div>

        <div className="w-full h-56 bg-slate-50/50 rounded-xl p-2 border border-slate-100">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 12, left: -20, bottom: 4 }}
            >
              <defs>
                <linearGradient id="bidBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#4338ca" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="todayBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="dayLabel"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={({ x, y, payload }) => {
                  const item = chartData.find((d) => d.dayLabel === payload.value);
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0}
                        y={0}
                        dy={14}
                        textAnchor="middle"
                        fill={item?.isToday ? '#4338ca' : '#64748b'}
                        fontWeight={item?.isToday ? 700 : 500}
                        fontSize={11}
                      >
                        {payload.value}
                      </text>
                      {item?.isToday && (
                        <text
                          x={0}
                          y={0}
                          dy={26}
                          textAnchor="middle"
                          fill="#6366f1"
                          fontWeight={600}
                          fontSize={9}
                        >
                          (Today)
                        </text>
                      )}
                    </g>
                  );
                }}
              />
              <YAxis
                allowDecimals={false}
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, maxVal]}
                ticks={yTicks}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as DailyBidData;
                    return (
                      <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2.5 shadow-xl border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-4 font-bold border-b border-slate-800 pb-1">
                          <span>{data.fullDate}</span>
                          {data.isToday && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500 text-white">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-slate-300">
                          <span>New Bids Submitted:</span>
                          <strong className="text-white font-bold text-sm">
                            {data.bidsCount}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-slate-300">
                          <span>Total 7-Day Cumulative:</span>
                          <strong className="text-amber-400 font-semibold">
                            {data.cumulativeBids}
                          </strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="bidsCount"
                name="Daily Bids"
                fill="url(#bidBarGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={42}
              />
              <Line
                type="monotone"
                dataKey="cumulativeBids"
                name="Cumulative Bids"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategic Competition Insights */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <AlertCircle className="w-4 h-4 text-indigo-600" />
          <span>Competition Guidance for Freelancers</span>
        </div>
        <p className="text-slate-600 leading-relaxed">
          {competitionLevel.desc}
        </p>
        <div className="flex items-start gap-1.5 text-slate-700 pt-0.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span className="font-medium">
            <strong>Recommended Action:</strong> {competitionLevel.advice}
          </span>
        </div>
      </div>
    </div>
  );
};
