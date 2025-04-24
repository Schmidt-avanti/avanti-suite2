
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto">
            <div className="px-8 py-6 w-full max-w-screen-2xl mx-auto h-full">
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 min-h-[300px] h-full">
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

