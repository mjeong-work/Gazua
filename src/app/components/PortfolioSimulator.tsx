import { useState, useMemo } from 'react';
import type { Simulation, TimeRange } from '../data/simulations';
import { MOCK_SIMULATIONS, filterChartData } from '../data/simulations';
import SimulationSetupCard from './SimulationSetupCard';
import PerformanceSummaryCards from './PerformanceSummaryCards';
import PerformanceTrendChart from './PerformanceTrendChart';
import PastSimulationsList from './PastSimulationsList';
import SimulationInsights from './SimulationInsights';
import ActualInvestmentSummary from './ActualInvestmentSummary';

type View = 'simulation' | 'actual';

export default function PortfolioSimulator() {
  const [view, setView] = useState<View>('simulation');
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation>(MOCK_SIMULATIONS[0]);
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [setupExpanded, setSetupExpanded] = useState(false);

  const filteredChartData = useMemo(
    () => filterChartData(selectedSimulation.chartData, timeRange),
    [selectedSimulation.chartData, timeRange],
  );

  const handleSelectSimulation = (simulation: Simulation) => {
    setSelectedSimulation(simulation);
    setTimeRange('ALL');
    setSetupExpanded(false);
  };

  return (
    <div className="space-y-5">
      {/* ── Header card ── */}
      <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Portfolio Simulator</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Test hypothetical investment scenarios</p>
        </div>

        {/* Segmented control */}
        <div className="flex bg-neutral-100 rounded-md p-0.5 flex-shrink-0">
          <button
            onClick={() => setView('simulation')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-sm transition-all ${
              view === 'simulation'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Simulation
          </button>
          <button
            onClick={() => setView('actual')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-sm transition-all ${
              view === 'actual'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Actual
          </button>
        </div>
      </div>

      {view === 'simulation' ? (
        <>
          {/* ── Simulation Setup ── */}
          <SimulationSetupCard
            simulation={selectedSimulation}
            expanded={setupExpanded}
            onToggle={() => setSetupExpanded(v => !v)}
          />

          {/* ── Performance Summary Cards ── */}
          <PerformanceSummaryCards simulation={selectedSimulation} />

          {/* ── Performance Trend Chart ── */}
          <PerformanceTrendChart
            chartData={filteredChartData}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />

          {/* ── Past Simulations ── */}
          <PastSimulationsList
            simulations={MOCK_SIMULATIONS}
            selectedId={selectedSimulation.id}
            onSelect={handleSelectSimulation}
          />

          {/* ── Simulation Insights ── */}
          <SimulationInsights insights={selectedSimulation.insights} />
        </>
      ) : (
        /* ── Actual Investment View ── */
        <ActualInvestmentSummary />
      )}
    </div>
  );
}
