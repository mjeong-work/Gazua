import { Badge } from '../ui/badge';

// Generalizes ModerationPage.tsx's STATUS_COLORS map to cover every status/role pill used
// across the admin section (report status, user status, content moderation status, role).
const COLORS: Record<string, string> = {
  // report status
  pending: 'bg-amber-50 text-amber-700',
  reviewed: 'bg-blue-50 text-blue-700',
  actioned: 'bg-green-50 text-green-700',
  dismissed: 'bg-neutral-100 text-neutral-500',
  // user status
  active: 'bg-green-50 text-green-700',
  warned: 'bg-amber-50 text-amber-700',
  suspended: 'bg-red-50 text-red-700',
  // content moderation status
  visible: 'bg-green-50 text-green-700',
  removed: 'bg-red-50 text-red-700',
  // role
  admin: 'bg-black text-white',
  user: 'bg-neutral-100 text-neutral-500',
};

interface AdminStatusBadgeProps {
  status: string;
  className?: string;
}

export default function AdminStatusBadge({ status, className = '' }: AdminStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`px-2 py-0.5 rounded-full border-transparent font-medium capitalize ${COLORS[status] ?? 'bg-neutral-100 text-neutral-500'} ${className}`}
    >
      {status}
    </Badge>
  );
}
