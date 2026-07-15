import { useState } from 'react';
import ChevronDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChevronUpIcon from '@mui/icons-material/KeyboardArrowUp';
import type { Simulation } from '../data/simulations';
import { formatPercent, formatDateRange } from '../data/simulations';

interface Props {
  simulations: Simulation[];
  selectedId: string;
  onSelect: (simulation: Simulation) => void;
}

export default function PastSimulationsList({ simulations, selectedId, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900">Past Simulations</span>
        {collapsed ? (
          <ChevronDownIcon sx={{ fontSize: 20, color: '#6b7280' }} />
        ) : (
          <ChevronUpIcon sx={{ fontSize: 20, color: '#6b7280' }} />
        )}
      </button>

      {!collapsed && (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {simulations.map(sim => {
            const isSelected = sim.id === selectedId;
            const diffPositive = sim.differencePercent >= 0;

            return (
              <button
                key={sim.id}
                onClick={() => onSelect(sim)}
                className={`w-full text-left px-5 py-4 transition-colors hover:bg-gray-50 ${
                  isSelected ? 'bg-violet-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: title + meta */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        isSelected ? 'bg-violet-500' : 'bg-gray-300'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-violet-700' : 'text-gray-800'}`}>
                        {sim.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {sim.holdings.length} holdings · ${sim.capital.toLocaleString()} ·{' '}
                        {formatDateRange(sim.startDate, sim.endDate)}
                      </p>
                    </div>
                  </div>

                  {/* Right: return stats */}
                  <div className="flex gap-4 flex-shrink-0 text-xs">
                    <div className="text-right">
                      <p className="text-gray-400">Hyp</p>
                      <p className="font-medium text-violet-600">
                        {formatPercent(sim.hypothesisReturnPercent)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400">Actual</p>
                      <p className={`font-medium ${sim.actualReturnPercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatPercent(sim.actualReturnPercent)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400">Diff</p>
                      <p className={`font-medium ${diffPositive ? 'text-green-600' : 'text-red-500'}`}>
                        {formatPercent(sim.differencePercent)}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
