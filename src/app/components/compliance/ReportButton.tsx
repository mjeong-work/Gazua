import { useState } from 'react'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { submitReport } from '../../../lib/services/compliance.service'
import type { ContentType, ReportReason } from '../../../types/compliance'

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'guaranteed_returns',    label: 'Claims guaranteed returns' },
  { value: 'coordinated_trading',   label: 'Promotes coordinated trading' },
  { value: 'buy_sell_instructions', label: 'Direct buy/sell instructions' },
  { value: 'undisclosed_promotion', label: 'Undisclosed paid promotion' },
  { value: 'fraud_allegation',      label: 'Unsupported fraud allegation' },
  { value: 'other',                 label: 'Other concern' },
]

interface ReportButtonProps {
  contentType: ContentType
  contentId: string
  /** Additional class names for the trigger button */
  className?: string
  /** When set, renders as a labeled row (icon + text) instead of an icon-only button — for use as a menu item. */
  label?: string
}

export default function ReportButton({
  contentType,
  contentId,
  className = '',
  label,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const close = () => {
    setOpen(false)
    setSelected(null)
    setDetails('')
    setDone(false)
  }

  const handleSubmit = async () => {
    if (!selected) return
    setSubmitting(true)
    await submitReport({
      contentType,
      contentId,
      reason: selected,
      details: details.trim() || undefined,
    })
    setSubmitting(false)
    setDone(true)
    setTimeout(close, 1800)
  }

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        title="Report content"
        aria-label="Report this content"
        className={
          className ||
          (label
            ? 'w-full flex items-center gap-3 px-3 py-3 text-sm text-neutral-700 hover:bg-neutral-50 rounded-md transition-colors'
            : 'text-neutral-400 hover:text-neutral-600 transition-colors')
        }
      >
        <FlagOutlinedIcon sx={{ fontSize: label ? 20 : 16 }} />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
          onClick={close}
        >
          <div
            className="bg-white rounded-md max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base">Report Content</h3>
              <button onClick={close} className="p-1 hover:bg-neutral-100 rounded-full transition-colors">
                <CloseIcon sx={{ fontSize: 18 }} />
              </button>
            </div>

            {done ? (
              <p className="text-sm text-brand text-center py-4">
                Report submitted. Thank you for keeping Gazua safe.
              </p>
            ) : (
              <>
                <p className="text-sm text-neutral-500 mb-4">
                  Why are you reporting this content?
                </p>

                <ul className="space-y-2.5 mb-4">
                  {REPORT_REASONS.map(r => (
                    <li key={r.value}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name={`report-reason-${contentId}`}
                          value={r.value}
                          checked={selected === r.value}
                          onChange={() => setSelected(r.value)}
                          className="accent-black"
                        />
                        <span className="text-sm text-neutral-700">{r.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>

                {selected === 'other' && (
                  <textarea
                    rows={2}
                    placeholder="Briefly describe the issue..."
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm resize-none focus:outline-none focus:border-neutral-400 mb-4"
                  />
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!selected || submitting}
                  className="w-full py-3 bg-black text-white rounded-sm text-sm font-bold hover:bg-black/80 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </button>

                <p className="text-[10px] text-neutral-400 text-center mt-3">
                  Reports are reviewed by the Gazua moderation team.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
