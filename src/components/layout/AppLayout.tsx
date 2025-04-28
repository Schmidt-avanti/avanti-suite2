
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import FloatingChatButton from '../floating-chat/FloatingChatButton';
import { useIsMobile } from '@/hooks/use-mobile';

const AppLayout: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto">
            <div className={`px-8 py-6 w-full max-w-screen-2xl mx-auto ${isMobile ? 'px-3 py-4' : ''}`}>
              <div className={`rounded-2xl bg-white border border-gray-100 shadow-sm ${isMobile ? 'p-3' : 'p-6'} min-h-[300px] overflow-hidden`}>
                <div className="w-full max-w-full overflow-x-hidden">
                  <Outlet />
                </div>
              </div>
            </div>
          </main>
        </div>
        <FloatingChatButton />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
