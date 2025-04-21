
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-gray-50">
        <div className="fixed left-0 top-0 h-full">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col ml-64">
          <Navbar />
          <main className="flex-1 p-8">
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
