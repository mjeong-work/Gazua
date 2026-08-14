import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import NotificationsIcon from '@mui/icons-material/Notifications';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArticleIcon from '@mui/icons-material/Article';
import CampaignIcon from '@mui/icons-material/Campaign';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AppHeader from './AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, markAsRead, markAllAsRead } from '../../lib/services/notifications.service';
import type { Notification, NotificationType } from '../../types/database';
import { useServiceQuery } from '../hooks/useServiceQuery';

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function typeIcon(type: NotificationType) {
  switch (type) {
    case 'creator_post': return <ArticleIcon sx={{ fontSize: 20, color: 'var(--brand)' }} />;
    case 'watchlist_post': return <BookmarkIcon sx={{ fontSize: 20, color: 'var(--brand)' }} />;
    case 'comment': return <ChatBubbleOutlineIcon sx={{ fontSize: 20, color: '#2563eb' }} />;
    case 'price_alert': return <TrendingUpIcon sx={{ fontSize: 20, color: '#d97706' }} />;
    case 'model_update': return <CampaignIcon sx={{ fontSize: 20, color: '#2563eb' }} />;
    default: return <NotificationsIcon sx={{ fontSize: 20, color: '#6b7280' }} />;
  }
}

/** Where clicking a notification should go — null (no navigation, just marks read) when
 * there's nothing to link to (a 'system' notification, or a legacy row from before
 * entity_type/entity_id existed). */
function buildRoute(n: Notification): string | null {
  if (!n.entity_type || !n.entity_id) return null;
  switch (n.entity_type) {
    case 'post': return `/main?post=${n.entity_id}`;
    case 'reel': return `/main/reels?reel=${n.entity_id}`;
    case 'video': return `/watch/${n.entity_id}`;
    case 'asset': return n.entity_ticker ? `/asset/${n.entity_ticker}` : null;
    default: return null;
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const { data: notificationsData, loading } = useServiceQuery(
    () => getNotifications(user!.id),
    [user?.id],
    { enabled: !!user, label: 'notifications' },
  );
  useEffect(() => { if (notificationsData) setNotifications(notificationsData); }, [notificationsData]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
    if (!user) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    markAsRead(id, user.id).catch(() => {});
    // AppHeader owns its own independent unread-count state (it's remounted fresh on real
    // navigation, but not when marking read without leaving this page) — nudge it to refetch
    // rather than going stale until the next route change.
    window.dispatchEvent(new Event('gazua:notifications-read'));
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) handleMarkRead(n.id);
    const route = buildRoute(n);
    if (route) navigate(route);
  };

  const handleMarkAllRead = () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    markAllAsRead(user.id).catch(() => {});
    window.dispatchEvent(new Event('gazua:notifications-read'));
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm font-medium text-brand hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="flex gap-3 p-4 rounded-md border border-neutral-100 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-neutral-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-neutral-200 rounded w-2/3" />
                    <div className="h-3 bg-neutral-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <NotificationsIcon sx={{ fontSize: 32, color: 'var(--icon-muted)' }} />
              </div>
              <h3 className="text-lg font-bold mb-1">No notifications yet</h3>
              <p className="text-neutral-600 text-sm max-w-sm">
                Market alerts, creator updates, and community activity will show up here.
              </p>
            </div>
          )}

          {!loading && notifications.length > 0 && (
            <div className="space-y-2">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full flex gap-3 p-4 rounded-md border text-left transition-colors ${
                    n.read ? 'border-neutral-100 bg-white' : 'border-brand/30 bg-brand/5'
                  } hover:border-neutral-300`}
                >
                  <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    {typeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />}
                    </div>
                    {n.message && <p className="text-sm text-neutral-600 mt-0.5">{n.message}</p>}
                    <p className="text-xs text-neutral-400 mt-1">{formatRelativeTime(n.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
