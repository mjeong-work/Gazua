import { useState } from 'react';
import {
  MOCK_ACTUAL_INVESTMENT_CONNECTED,
  MOCK_ACTUAL_INVESTMENT_DISCONNECTED,
  formatCurrency,
  formatPercent,
} from '../data/simulations';

export default function ActualInvestmentSummary() {
  // Toggle between connected / disconnected for design preview
  const [showConnected, setShowConnected] = useState(false);
  const data = showConnected
    ? MOCK_ACTUAL_INVESTMENT_CONNECTED
    : MOCK_ACTUAL_INVESTMENT_DISCONNECTED;

  return (
    <div className="space-y-5">
      {/* Design-preview toggle (not shown to end users — remove in production) */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span>Preview:</span>
          <button
            onClick={() => setShowConnected(false)}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              !showConnected ? 'bg-neutral-200 text-neutral-700 font-medium' : 'hover:bg-neutral-100 text-neutral-400'
            }`}
          >
            Disconnected
          </button>
          <button
            onClick={() => setShowConnected(true)}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              showConnected ? 'bg-neutral-200 text-neutral-700 font-medium' : 'hover:bg-neutral-100 text-neutral-400'
            }`}
          >
            Connected
          </button>
        </div>
      </div>

      {!data.connected ? (
        /* ── Empty state ── */
        <div className="border border-neutral-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-neutral-800 mb-2">No brokerage account connected</h3>
          <p className="text-sm text-neutral-500 max-w-sm mb-6">
            Connect your brokerage account to display verified investment performance.
          </p>
          <button className="px-6 py-2.5 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors">
            Connect Account
          </button>
        </div>
      ) : (
        /* ── Connected state ── */
        <div className="space-y-4">
          {/* Account header */}
          <div className="border border-neutral-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-green-600 font-medium">Live</span>
                </div>
                <h3 className="font-semibold text-neutral-900">{data.brokerName} Account</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Last synced:{' '}
                  {data.lastSyncedAt
                    ? new Date(data.lastSyncedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : '—'}
                </p>
              </div>
              <button className="text-xs text-neutral-400 hover:text-neutral-600 border border-neutral-200 rounded-lg px-3 py-1.5 transition-colors">
                Sync now
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-xs text-neutral-400 mb-1">Account Value</p>
                <p className="text-xl font-bold text-neutral-900">
                  {formatCurrency(data.accountValue ?? 0)}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs text-green-500 mb-1">Total Return</p>
                <p className="text-xl font-bold text-green-700">
                  {formatPercent(data.totalReturnPercent ?? 0)}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs text-green-500 mb-1">Return ($)</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(data.totalReturnValue ?? 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-blue-700">
              Performance data is pulled directly from your linked {data.brokerName} account and updated every 15 minutes during market hours.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
