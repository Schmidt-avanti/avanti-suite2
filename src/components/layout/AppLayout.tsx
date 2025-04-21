
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 z-20 w-64 bg-white">
          <AppSidebar />
        </div>
        
        {/* Main content */}
        <div className="flex flex-col flex-1 ml-64">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto w-full max-w-[1400px]">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
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
