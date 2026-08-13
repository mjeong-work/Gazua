import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: DashboardOutlinedIcon, exact: true },
  { to: '/admin/users', label: 'Users', icon: GroupOutlinedIcon, exact: false },
  { to: '/admin/reports', label: 'Reports', icon: FlagOutlinedIcon, exact: false },
  { to: '/admin/content', label: 'Content', icon: ArticleOutlinedIcon, exact: false },
  { to: '/admin/audit-log', label: 'Audit Log', icon: HistoryOutlinedIcon, exact: false },
];

interface AdminSidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

// Modeled directly on CreatorsSidebar.tsx's collapse (lg:w-12/lg:w-60, chevron toggle) + mobile
// off-canvas drawer (-translate-x-full -> translate-x-0, bg-black/40 backdrop) mechanics —
// the only structural difference is the mobile trigger lives in AdminHeader (a hamburger
// button, conventional for an admin shell with its own header bar) rather than a floating FAB.
export default function AdminSidebar({ isMobileOpen, onMobileClose }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');

  return (
    <>
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={onMobileClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-neutral-200 overflow-y-auto transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:z-auto lg:flex-shrink-0 lg:h-full lg:overflow-x-hidden
          ${isExpanded ? 'lg:w-56' : 'lg:w-14'}`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-200 lg:hidden">
          <span className="font-bold text-lg">Admin</span>
          <button onClick={onMobileClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors" aria-label="Close menu">
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <div className={`hidden lg:flex items-center border-b border-neutral-200 py-3 ${isExpanded ? 'justify-end px-2' : 'justify-center px-0'}`}>
          <button
            onClick={() => setIsExpanded(v => !v)}
            className="icon-tap-target p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? <ChevronLeftIcon sx={{ fontSize: 18 }} /> : <ChevronRightIcon sx={{ fontSize: 18 }} />}
          </button>
        </div>

        <nav className={`space-y-1 transition-all duration-300 ${isExpanded ? 'p-3' : 'p-3 lg:px-1.5'}`}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                onClick={() => { navigate(item.to); onMobileClose(); }}
                title={!isExpanded ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 py-2.5 rounded-full text-left transition-colors ${
                  isExpanded ? 'px-3' : 'px-3 lg:px-0 lg:justify-center'
                } ${active ? 'bg-brand/10 text-brand' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                <Icon sx={{ fontSize: 20 }} />
                <span className={`text-sm font-medium ${isExpanded ? '' : 'lg:hidden'}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
