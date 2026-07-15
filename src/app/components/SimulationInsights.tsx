interface Props {
  insights: string[];
}

export default function SimulationInsights({ insights }: Props) {
  return (
    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <h3 className="font-semibold text-yellow-800 text-sm">Simulation Insights</h3>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-yellow-900">
            <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}
