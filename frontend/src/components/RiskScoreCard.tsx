interface Props {
  score: number;
  category: string;
  confidence: number;
}

const CATEGORY_COLOR: Record<string, string> = {
  LOW: "text-risk-low",
  MEDIUM: "text-risk-medium",
  HIGH: "text-risk-high",
};

export default function RiskScoreCard({ score, category, confidence }: Props) {
  const color = CATEGORY_COLOR[category] ?? "text-slate-300";
  return (
    <div className="card flex flex-col items-center justify-center text-center">
      <p className="text-slate-400 text-sm uppercase tracking-wide">Overall Risk Score</p>
      <p className={`text-6xl font-bold mt-2 ${color}`}>{score}</p>
      <p className="text-slate-500 text-sm">/ 100</p>
      <span className={`mt-3 px-3 py-1 rounded-full text-sm font-medium badge-${category}`}>{category}</span>
      <p className="text-xs text-slate-500 mt-2">ML classifier confidence: {(confidence * 100).toFixed(1)}%</p>
    </div>
  );
}
