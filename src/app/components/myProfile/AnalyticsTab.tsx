import InsightsIcon from '@mui/icons-material/Insights';

// Real creator analytics (views, watch time, revenue, follower growth, etc.) require a
// backing data pipeline that doesn't exist yet — this used to render fully fabricated numbers
// in the same visual shape as a real dashboard, which read as this creator's actual
// performance. Showing an honest "not available yet" state here instead of inventing that data.
export default function AnalyticsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
        <InsightsIcon sx={{ fontSize: 32, color: '#9ca3af' }} />
      </div>
      <h3 className="text-xl font-bold mb-2">Analytics coming soon</h3>
      <p className="text-neutral-500 text-sm max-w-sm">
        Creator analytics (views, watch time, engagement, and revenue) aren't available during beta yet.
        We'll let you know when this is ready.
      </p>
    </div>
  );
}
