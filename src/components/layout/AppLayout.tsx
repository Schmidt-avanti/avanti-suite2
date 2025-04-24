
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useSupervisorChat } from '@/contexts/SupervisorChatContext';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const { openChat, hasNewMessages } = useSupervisorChat();
  const { toast } = useToast();

  const handleChatOpen = () => {
    openChat();
    if (!hasNewMessages) {
      toast({
        description: "Keine neuen Nachrichten vorhanden."
      });
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 relative">
            <div className="px-8 py-6 w-full max-w-screen-2xl mx-auto">
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 min-h-[300px]">
                <Outlet />
              </div>
            </div>
            
            {/* Chat button for agents */}
            {user?.role === 'agent' && (
              <div className="fixed bottom-6 right-6">
                <Button 
                  onClick={handleChatOpen}
                  className="rounded-full h-14 w-14 p-0 shadow-lg"
                  size="icon"
                >
                  <MessageCircle className="h-6 w-6" />
                  {hasNewMessages && (
                    <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full"></span>
                  )}
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
