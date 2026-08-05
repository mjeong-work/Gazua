import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  getUserDetail,
  getUserContentHistory,
  getUserReportsFiled,
  getUserReportsAgainst,
  getUserModerationHistory,
  setUserStatus,
  setCredibilityLevel,
} from '../../../lib/services/adminUsers.service';
import AdminStatusBadge from './AdminStatusBadge';
import AdminConfirmDialog from './AdminConfirmDialog';
import AdminLoadingSkeleton from './AdminLoadingSkeleton';
import AdminErrorState from './AdminErrorState';
import type { AdminUserDetail, AdminReportListItem, AdminModerationActionItem } from '../../../types/admin';
import type { CredibilityLevel } from '../../../types/database';

const CREDIBILITY_LEVELS: CredibilityLevel[] = ['explorer', 'contributor', 'analyst', 'educator', 'verified_pro'];

type PendingAction = 'warning_sent' | 'user_suspended' | 'user_reinstated' | null;

export default function AdminUserDetailPage() {
  const { userId = '' } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [content, setContent] = useState<{ posts: unknown[]; reels: unknown[]; videos: unknown[] } | null>(null);
  const [reportsFiled, setReportsFiled] = useState<AdminReportListItem[]>([]);
  const [reportsAgainst, setReportsAgainst] = useState<AdminReportListItem[]>([]);
  const [modHistory, setModHistory] = useState<AdminModerationActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [detailRes, contentRes, filedRes, againstRes, historyRes] = await Promise.all([
      getUserDetail(userId),
      getUserContentHistory(userId),
      getUserReportsFiled(userId),
      getUserReportsAgainst(userId),
      getUserModerationHistory(userId),
    ]);
    if (detailRes.error || !detailRes.data) {
      setError(true);
    } else {
      setDetail(detailRes.data);
      setContent(contentRes.data);
      setReportsFiled(filedRes.data ?? []);
      setReportsAgainst(againstRes.data ?? []);
      setModHistory(historyRes.data ?? []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleChangeCredibilityLevel = async (level: CredibilityLevel) => {
    const { success, error: err } = await setCredibilityLevel({ userId, level });
    if (success) {
      toast.success('Credibility level updated');
      load();
    } else {
      toast.error(err ?? 'Failed to update credibility level');
    }
  };

  const handleConfirmAction = async (notes?: string) => {
    if (!pendingAction) return;
    const status = pendingAction === 'user_suspended' ? 'suspended' : pendingAction === 'user_reinstated' ? 'active' : 'warned';
    const { success, error: err } = await setUserStatus({ userId, status, reason: notes, action: pendingAction });
    setPendingAction(null);
    if (success) {
      toast.success('User updated');
      load();
    } else {
      toast.error(err ?? 'Failed to update user');
    }
  };

  if (loading) return <AdminLoadingSkeleton rows={2} />;
  if (error || !detail) return <AdminErrorState onRetry={load} />;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-black transition-colors">
        <ArrowBackIcon sx={{ fontSize: 16 }} />
        Back to Users
      </button>

      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold">{detail.full_name}</h1>
              <AdminStatusBadge status={detail.role} />
              <AdminStatusBadge status={detail.status} />
            </div>
            <p className="text-sm text-neutral-500">@{detail.username}{detail.handle ? ` · ${detail.handle}` : ''}</p>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs font-medium text-neutral-500">Credibility level</label>
              <select
                value={detail.credibility_level}
                onChange={(e) => handleChangeCredibilityLevel(e.target.value as CredibilityLevel)}
                className="text-xs border border-neutral-200 rounded-full px-2.5 py-1 focus:outline-none focus:border-black transition-colors"
              >
                {CREDIBILITY_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            {detail.bio && <p className="text-sm text-neutral-600 mt-2 max-w-lg">{detail.bio}</p>}
            {detail.status === 'suspended' && detail.suspended_reason && (
              <p className="text-xs text-red-600 mt-2">Suspended: {detail.suspended_reason}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {detail.status !== 'suspended' && (
              <button
                onClick={() => setPendingAction('warning_sent')}
                className="px-4 py-2 text-xs font-medium rounded-full border border-neutral-800 text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                Warn
              </button>
            )}
            {detail.status !== 'suspended' ? (
              <button
                onClick={() => setPendingAction('user_suspended')}
                className="px-4 py-2 text-xs font-medium rounded-full border border-red-300 text-red-800 hover:bg-red-50 transition-colors"
              >
                Suspend
              </button>
            ) : (
              <button
                onClick={() => setPendingAction('user_reinstated')}
                className="px-4 py-2 text-xs font-medium rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Reinstate
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-5 pt-5 border-t border-neutral-100">
          <Stat label="Posts" value={detail.postCount} />
          <Stat label="Reels" value={detail.reelCount} />
          <Stat label="Videos" value={detail.videoCount} />
          <Stat label="Followers" value={detail.followerCount} />
          <Stat label="Following" value={detail.followingCount} />
        </div>
      </div>

      <Section title="Content History">
        {!content || (content.posts.length + content.reels.length + content.videos.length === 0) ? (
          <p className="text-sm text-neutral-400 py-4 text-center">No content.</p>
        ) : (
          <div className="space-y-2">
            {content.posts.map(p => <ContentRow key={`post-${(p as { id: string }).id}`} type="post" item={p as Record<string, unknown>} previewKey="content" />)}
            {content.reels.map(r => <ContentRow key={`reel-${(r as { id: string }).id}`} type="reel" item={r as Record<string, unknown>} previewKey="caption" />)}
            {content.videos.map(v => <ContentRow key={`video-${(v as { id: string }).id}`} type="video" item={v as Record<string, unknown>} previewKey="title" />)}
          </div>
        )}
      </Section>

      <Section title="Reports Filed">
        {reportsFiled.length === 0 ? <p className="text-sm text-neutral-400 py-4 text-center">None.</p> : (
          <ReportRows reports={reportsFiled} />
        )}
      </Section>

      <Section title="Reports Against">
        {reportsAgainst.length === 0 ? <p className="text-sm text-neutral-400 py-4 text-center">None.</p> : (
          <ReportRows reports={reportsAgainst} />
        )}
      </Section>

      <Section title="Moderation History">
        {modHistory.length === 0 ? <p className="text-sm text-neutral-400 py-4 text-center">No warnings, suspensions, or reinstatements.</p> : (
          <div className="space-y-2">
            {modHistory.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-3 p-3 bg-neutral-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium capitalize">{m.action.replace(/_/g, ' ')}</p>
                  {m.notes && <p className="text-xs text-neutral-500 mt-0.5">{m.notes}</p>}
                </div>
                <span className="text-xs text-neutral-400">{new Date(m.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {pendingAction && (
        <AdminConfirmDialog
          title={
            pendingAction === 'warning_sent' ? 'Send warning?'
              : pendingAction === 'user_suspended' ? 'Suspend this user?'
              : 'Reinstate this user?'
          }
          body={
            pendingAction === 'user_suspended'
              ? 'The account will be marked suspended. This is reversible via Reinstate.'
              : undefined
          }
          withNotes
          destructive={pendingAction === 'user_suspended'}
          confirmLabel={pendingAction === 'warning_sent' ? 'Send Warning' : pendingAction === 'user_suspended' ? 'Suspend' : 'Reinstate'}
          onConfirm={handleConfirmAction}
          onClose={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <h2 className="text-base font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function ContentRow({ type, item, previewKey }: { type: string; item: Record<string, unknown>; previewKey: string }) {
  const preview = String(item[previewKey] ?? '');
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-neutral-50 rounded-lg">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">{type}</span>
          <AdminStatusBadge status={String(item.moderation_status)} />
        </div>
        <p className="text-sm text-neutral-700 truncate">{preview}</p>
      </div>
      <span className="text-xs text-neutral-400 flex-shrink-0">{new Date(String(item.created_at)).toLocaleDateString()}</span>
    </div>
  );
}

function ReportRows({ reports }: { reports: AdminReportListItem[] }) {
  return (
    <div className="space-y-2">
      {reports.map(r => (
        <div key={r.id} className="flex items-center justify-between gap-3 p-3 bg-neutral-50 rounded-lg">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">{r.content_type}</span>
              <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-full font-medium capitalize">{r.reason.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-xs text-neutral-400 truncate font-mono">{r.content_id}</p>
          </div>
          <AdminStatusBadge status={r.status} />
        </div>
      ))}
    </div>
  );
}
