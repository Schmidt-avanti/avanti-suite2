
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex bg-gray-50">
        {/* Fixed sidebar container */}
        <div className="fixed left-0 top-0 bottom-0 w-sidebar z-10">
          <AppSidebar />
        </div>
        
        {/* Main content with proper margin */}
        <div className="flex-1 pl-sidebar w-full">
          <Navbar />
          <main className="p-8">
            <div className="mx-auto max-w-7xl w-full">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
