import { useNavigate } from 'react-router';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../../contexts/AuthContext';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

// Small, admin-only header — deliberately not a reuse of the consumer-facing AppHeader.tsx,
// whose nav (Home/Creators/Messages, mobile bottom nav) is irrelevant here. Same typography/
// spacing language as AppHeader's desktop header bar, scoped down to what admin needs.
export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <header className="border-b border-gray-200 bg-white shrink-0">
      <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon sx={{ fontSize: 22 }} />
          </button>
          <h1 className="text-lg font-bold tracking-tight">Gazua Admin</h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-sm text-gray-500">{profile?.full_name}</span>
          <button
            onClick={() => navigate('/main')}
            className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
          >
            Back to app
          </button>
        </div>
      </div>
    </header>
  );
}
