import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { TopNavbar } from '../components/common/TopNavbar';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Dark Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Workspace Frame (Crisp White and Black Theme) */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-[#F8FAFC]">
        {/* Top Navigation in Clean White Style */}
        <TopNavbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} isLightMode={true} />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 bg-[#F8FAFC]">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
