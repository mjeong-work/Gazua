import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { getUserStats, getGrowthMetrics } from '../../../lib/services/adminStats.service';
import { listReports } from '../../../lib/services/adminReports.service';
import AdminStatCard from './AdminStatCard';
import AdminGrowthChart from './AdminGrowthChart';
import AdminStatusBadge from './AdminStatusBadge';
import AdminLoadingSkeleton from './AdminLoadingSkeleton';
import AdminErrorState from './AdminErrorState';
import type { GrowthBucket, GrowthPoint, UserStats, AdminReportListItem } from '../../../types/admin';

const REASON_LABELS: Record<string, string> = {
  guaranteed_returns: 'Guaranteed Returns',
  coordinated_trading: 'Coordinated Trading',
  buy_sell_instructions: 'Buy/Sell Instructions',
  undisclosed_promotion: 'Undisclosed Promotion',
  fraud_allegation: 'Fraud Allegation',
  other: 'Other',
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [bucket, setBucket] = useState<GrowthBucket>('day');
  const [pendingReports, setPendingReports] = useState<AdminReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [statsRes, growthRes, reportsRes] = await Promise.all([
      getUserStats(),
      getGrowthMetrics(bucket),
      listReports({ status: 'pending', page: 0, pageSize: 5 }),
    ]);
    if (statsRes.error || growthRes.error || reportsRes.error) {
      setError(true);
    } else {
      setStats(statsRes.data);
      setGrowth(growthRes.data ?? []);
      setPendingReports(reportsRes.data?.rows ?? []);
    }
    setLoading(false);
  }, [bucket]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <AdminLoadingSkeleton rows={4} />;
  if (error || !stats) return <AdminErrorState onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview and growth metrics.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <AdminStatCard label="Total Users" value={stats.totalUsers.toLocaleString()} />
        <AdminStatCard label="New (30d)" value={stats.newUsersLast30d.toLocaleString()} />
        <AdminStatCard
          label="Active (30d)"
          value={stats.activeUsersLast30d.toLocaleString()}
          caption="Based on recent activity, not login sessions"
        />
        <AdminStatCard label="Suspended" value={stats.suspendedUsers.toLocaleString()} />
        <AdminStatCard label="Creators" value={stats.creators.toLocaleString()} />
      </div>

      <AdminGrowthChart data={growth} bucket={bucket} onBucketChange={setBucket} />

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Needs Attention</h2>
          <button onClick={() => navigate('/admin/reports')} className="text-xs font-medium text-gray-500 hover:text-black transition-colors">
            View all reports →
          </button>
        </div>
        {pendingReports.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No pending reports.</p>
        ) : (
          <div className="space-y-2">
            {pendingReports.map(report => (
              <div key={report.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{report.content_type}</span>
                    <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-full font-medium">
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate font-mono">{report.content_id}</p>
                </div>
                <AdminStatusBadge status={report.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
