import { useState, useEffect } from 'react'
import AppHeader from './AppHeader'
import {
  getPendingReports,
  saveModerationAction,
} from '../../lib/services/compliance.service'
import type { ContentReport, ModerationActionType } from '../../types/compliance'

const REASON_LABELS: Record<string, string> = {
  guaranteed_returns:    'Guaranteed Returns',
  coordinated_trading:   'Coordinated Trading',
  buy_sell_instructions: 'Buy/Sell Instructions',
  undisclosed_promotion: 'Undisclosed Promotion',
  fraud_allegation:      'Fraud Allegation',
  other:                 'Other',
}

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700',
  reviewed:   'bg-blue-50 text-blue-700',
  actioned:   'bg-green-50 text-green-700',
  dismissed:  'bg-gray-100 text-gray-500',
}

const ACTIONS: { value: ModerationActionType; label: string; style: string }[] = [
  { value: 'dismissed',      label: 'Dismiss',        style: 'border-gray-200 text-gray-700 hover:bg-gray-50' },
  { value: 'warning_sent',   label: 'Send Warning',   style: 'border-gray-800 text-gray-900 hover:bg-gray-100' },
  { value: 'content_removed',label: 'Remove Content', style: 'border-red-200 text-red-700 hover:bg-red-50' },
  { value: 'user_suspended', label: 'Suspend User',   style: 'border-red-300 text-red-800 hover:bg-red-50' },
]

export default function ModerationPage() {
  const [reports, setReports] = useState<ContentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'all' | 'pending'>('pending')

  useEffect(() => {
    getPendingReports().then(({ data }) => {
      setReports(data ?? [])
      setLoading(false)
    })
  }, [])

  const handleAction = async (report: ContentReport, action: ModerationActionType) => {
    setActioning(report.id)
    const { success, error } = await saveModerationAction({
      reportId: report.id,
      contentType: report.content_type,
      contentId: report.content_id,
      action,
      notes: notes[report.id]?.trim(),
    })
    if (success) {
      setReports(prev =>
        prev.map(r => r.id === report.id
          ? { ...r, status: action === 'dismissed' ? 'dismissed' : 'actioned' }
          : r,
        ),
      )
    } else {
      console.error('[moderation] action error:', error)
    }
    setActioning(null)
  }

  const visible = filter === 'pending'
    ? reports.filter(r => r.status === 'pending')
    : reports

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Content Moderation</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review user-reported content and take action.
            </p>
          </div>
          <div className="flex gap-2">
            {(['pending', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-xs font-medium rounded-full border transition-colors capitalize ${
                  filter === f
                    ? 'bg-black text-white border-black'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {f === 'pending' ? 'Pending' : 'All Reports'}
              </button>
            ))}
          </div>
        </div>

        {/* Platform disclaimer */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-medium text-gray-700">Platform Disclaimer: </span>
            All content on Gazua is user-generated and does not constitute investment advice.
            Gazua does not endorse or guarantee any content. Moderation actions are logged
            for compliance and audit purposes.
          </p>
        </div>

        {/* Report queue */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="border border-gray-200 rounded-xl p-5 animate-pulse">
                <div className="flex gap-2 mb-3">
                  <div className="h-4 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">
              {filter === 'pending' ? 'No pending reports.' : 'No reports found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map(report => (
              <div
                key={report.id}
                className={`border rounded-xl p-5 transition-opacity ${
                  report.status !== 'pending' ? 'opacity-60' : ''
                } border-gray-200`}
              >
                {/* Report header */}
                <div className="flex items-start gap-3 mb-3 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-0.5">
                    {report.content_type}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-full font-medium">
                    {REASON_LABELS[report.reason] ?? report.reason}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[report.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {report.status}
                  </span>
                </div>

                {/* Content ID + timestamp */}
                <p className="text-[11px] text-gray-400 mb-2 font-mono">
                  content_id: {report.content_id}
                  <span className="ml-3 font-sans not-italic">
                    · {new Date(report.created_at).toLocaleString()}
                  </span>
                </p>

                {/* Reporter detail */}
                {report.details && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-3">
                    <p className="text-sm text-gray-700 italic">"{report.details}"</p>
                  </div>
                )}

                {/* Moderator notes */}
                {report.status === 'pending' && (
                  <>
                    <textarea
                      placeholder="Moderator notes (optional, saved with audit log)"
                      value={notes[report.id] ?? ''}
                      onChange={e =>
                        setNotes(prev => ({ ...prev, [report.id]: e.target.value }))
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-gray-400 mb-3"
                    />

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      {ACTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleAction(report, opt.value)}
                          disabled={actioning === report.id}
                          className={`px-4 py-2 text-xs font-medium rounded-full border transition-colors disabled:opacity-50 ${opt.style}`}
                        >
                          {actioning === report.id ? '…' : opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
