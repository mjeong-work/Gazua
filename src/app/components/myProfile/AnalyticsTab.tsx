import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

// Fully self-contained — every number here is generated mock data, no props needed.
export default function AnalyticsTab() {
  const viewTrend = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`,
    views: Math.floor(3000 + Math.random() * 8000 + i * 120),
    watchTime: Math.floor(8000 + Math.random() * 15000 + i * 200),
  }));
  const followerTrend = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`,
    followers: 120000 + i * 230 + Math.floor(Math.random() * 400),
  }));
  const postEngagement = Array.from({ length: 14 }, (_, i) => ({
    day: `D${i + 1}`,
    likes: Math.floor(800 + Math.random() * 2000),
    comments: Math.floor(40 + Math.random() * 200),
    reposts: Math.floor(100 + Math.random() * 600),
  }));
  const topVideos = [
    { title: 'Why I Sold All My Tesla Stock', views: '567K', watchTime: '42min avg', ctr: '6.8%', trend: '+12%' },
    { title: 'How I Made $100K This Year', views: '421K', watchTime: '38min avg', ctr: '5.9%', trend: '+8%' },
    { title: 'Market Crash Coming? My Take', views: '312K', watchTime: '29min avg', ctr: '4.2%', trend: '+3%' },
    { title: '5 Stocks I\'m Buying in 2026', views: '234K', watchTime: '22min avg', ctr: '3.8%', trend: '-1%' },
    { title: 'Dividend Investing 101', views: '189K', watchTime: '19min avg', ctr: '3.1%', trend: '+5%' },
  ];
  const trafficSources = [
    { source: 'Direct / Home feed', pct: 38 },
    { source: 'Search', pct: 27 },
    { source: 'External links', pct: 18 },
    { source: 'Notifications', pct: 11 },
    { source: 'Other', pct: 6 },
  ];
  const milestones = [
    { icon: '🎉', text: 'Reached 127K followers', time: '2 days ago' },
    { icon: '🔥', text: '"Why I Sold Tesla" hit 500K views', time: '5 days ago' },
    { icon: '📈', text: 'Best week: 48K new views', time: '1 week ago' },
    { icon: '💬', text: '1,000+ comments this month', time: '2 weeks ago' },
  ];

  return (
    <div className="space-y-6">

      {/* Overview cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Views (30d)', value: '184K', delta: '+12%', pos: true },
          { label: 'Watch time (30d)', value: '9,240 hrs', delta: '+8%', pos: true },
          { label: 'Subscribers gained', value: '+6,840', delta: '+21%', pos: true },
          { label: 'Revenue (30d)', value: '$2,340', delta: '-3%', pos: false },
        ].map((card) => (
          <div key={card.label} className="p-4 bg-white border border-neutral-200 rounded-xl">
            <p className="text-xs text-neutral-500 mb-1">{card.label}</p>
            <p className="text-xl font-bold mb-0.5">{card.value}</p>
            <span className={`text-xs font-medium ${card.pos ? 'text-brand' : 'text-red-500'}`}>{card.delta} vs last month</span>
          </div>
        ))}
      </div>

      {/* Video view trend */}
      <div className="p-5 bg-white border border-neutral-200 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Video Views — Last 30 days</h2>
          <span className="text-xs text-neutral-400">184,320 total</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={viewTrend} key="analytics-views-chart">
              <XAxis dataKey="day" hide key="analytics-views-xaxis" />
              <YAxis hide key="analytics-views-yaxis" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, padding: '6px 10px' }} formatter={(v: number) => [v.toLocaleString(), 'Views']} labelFormatter={() => ''} />
              <Line type="monotone" dataKey="views" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} key="analytics-views-line" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Top videos */}
        <div className="p-5 bg-white border border-neutral-200 rounded-xl">
          <h2 className="text-base font-semibold mb-4">Top Videos</h2>
          <div className="space-y-3">
            {topVideos.map((v, i) => (
              <div key={v.title} className="flex items-center gap-3">
                <span className="text-xs font-bold text-neutral-400 w-4 flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.title}</p>
                  <div className="flex items-center gap-3 text-xs text-neutral-400 mt-0.5">
                    <span>{v.views} views</span>
                    <span>·</span>
                    <span>{v.watchTime}</span>
                    <span>·</span>
                    <span>CTR {v.ctr}</span>
                  </div>
                </div>
                <span className={`text-xs font-semibold flex-shrink-0 ${v.trend.startsWith('+') ? 'text-brand' : 'text-red-500'}`}>{v.trend}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Follower growth */}
        <div className="p-5 bg-white border border-neutral-200 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Follower Growth</h2>
            <span className="text-xs text-neutral-400">+6,840 this month</span>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={followerTrend} key="analytics-followers-chart">
                <XAxis dataKey="day" hide key="analytics-followers-xaxis" />
                <YAxis hide key="analytics-followers-yaxis" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, padding: '6px 10px' }} formatter={(v: number) => [v.toLocaleString(), 'Followers']} labelFormatter={() => ''} />
                <Line type="monotone" dataKey="followers" stroke="var(--mint)" strokeWidth={2} dot={false} isAnimationActive={false} key="analytics-followers-line" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
            <span>Start: <strong className="text-black">120K</strong></span>
            <span>Now: <strong className="text-black">127K</strong></span>
            <span>Peak day: <strong className="text-black">+312</strong></span>
          </div>
        </div>
      </div>

      {/* Post engagement trends */}
      <div className="p-5 bg-white border border-neutral-200 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Post Engagement — Last 14 days</h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-brand" /><span>Likes</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-blue-400" /><span>Comments</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-purple-400" /><span>Reposts</span></div>
          </div>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={postEngagement} key="analytics-engagement-chart">
              <XAxis dataKey="day" tick={{ fontSize: 10 }} key="analytics-engagement-xaxis" />
              <YAxis hide key="analytics-engagement-yaxis" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, padding: '6px 10px' }} />
              <Line type="monotone" dataKey="likes" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} key="analytics-likes-line" />
              <Line type="monotone" dataKey="comments" stroke="#60a5fa" strokeWidth={2} dot={false} isAnimationActive={false} key="analytics-comments-line" />
              <Line type="monotone" dataKey="reposts" stroke="#a78bfa" strokeWidth={2} dot={false} isAnimationActive={false} key="analytics-reposts-line" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Traffic sources */}
        <div className="p-5 bg-white border border-neutral-200 rounded-xl">
          <h2 className="text-base font-semibold mb-4">Traffic Sources</h2>
          <div className="space-y-3">
            {trafficSources.map((s) => (
              <div key={s.source}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-neutral-700">{s.source}</span>
                  <span className="font-semibold">{s.pct}%</span>
                </div>
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent milestones */}
        <div className="p-5 bg-white border border-neutral-200 rounded-xl">
          <h2 className="text-base font-semibold mb-4">Recent Milestones</h2>
          <div className="space-y-3">
            {milestones.map((m) => (
              <div key={m.text} className="flex items-start gap-3">
                <span className="text-lg leading-none mt-0.5">{m.icon}</span>
                <div>
                  <p className="text-sm font-medium">{m.text}</p>
                  <p className="text-xs text-neutral-400">{m.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
