
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 z-30 w-64 bg-sidebar border-r border-sidebar-border">
          <AppSidebar />
        </div>
        {/* Hauptinhalt + Navbar */}
        <div className="flex-1 ml-64 flex flex-col">
          {/* Topbar: Full-Width, Padding nur intern */}
          <Navbar />
          {/* Content Bereich: Padding, KEIN max-width */}
          <main className="flex-1">
            <div className="px-8 py-6 w-full max-w-screen-2xl mx-auto">
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 min-h-[300px]">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
