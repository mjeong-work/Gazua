import { useState } from 'react';
import { Outlet } from 'react-router';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

// Shell composing AdminHeader + AdminSidebar + <Outlet/> for every /admin/* route. Owns the
// mobile sidebar open/close state shared between the header's hamburger and the sidebar itself.
export default function AdminLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-white">
      <AdminHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />
      <div className="flex-1 flex min-h-0">
        <AdminSidebar isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
