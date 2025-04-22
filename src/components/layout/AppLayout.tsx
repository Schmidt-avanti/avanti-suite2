
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { useIsMobile } from '@/hooks/use-mobile';

const AppLayout: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <ThemeProvider defaultTheme="light" storageKey="avanti-theme">
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="flex min-h-screen bg-background">
          <AppSidebar />
          <div className="flex-1">
            <Navbar />
            <main className="relative min-h-[calc(100vh-4rem)]">
              <div className="container mx-auto p-4 md:p-6">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default AppLayout;
