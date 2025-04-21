
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar with fixed width */}
        <div className="fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100">
          <AppSidebar />
        </div>
        
        {/* Main content area */}
        <div className="flex-1 ml-64">
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">
            <div className="mx-auto min-w-[960px] max-w-[1200px] px-8 py-6">
              <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-6">
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
