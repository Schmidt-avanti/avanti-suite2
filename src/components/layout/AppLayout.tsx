
// src/components/layout/AppLayout.tsx
import { Outlet, useLocation } from 'react-router-dom';
import { SearchProvider } from '@/contexts/SearchContext';
import Navbar from './Navbar';
import AppSidebar from './AppSidebar';
import { TwilioProvider } from '@/contexts/TwilioContext';
import { TaskSessionProvider } from '@/contexts/TaskSessionContext';
import ActiveCallPanel from '@/components/call-center/ActiveCallPanel';
import { Suspense, lazy, useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';

// Lazy load components that might not be needed immediately
const FloatingChatButton = lazy(() =>
  import('@/components/floating-chat/FloatingChatButton')
);

const AppLayout = () => {
  const location = useLocation();
  const [isTwilioLoaded, setIsTwilioLoaded] = useState<boolean>(false);
  
  // Check if we're on routes that need Twilio
  const isTwilioNeededRoute = 
    location.pathname === '/call-center' || 
    location.pathname.startsWith('/tasks/') ||
    location.pathname === '/tasks';
  
  // Load Twilio script only when needed  
  useEffect(() => {
    if (isTwilioNeededRoute && !isTwilioLoaded) {
      // Ensure Twilio script is loaded before initializing
      const loadTwilioScript = () => {
        if (!document.getElementById('twilio-js')) {
          const script = document.createElement('script');
          script.id = 'twilio-js';
          script.src = 'https://sdk.twilio.com/js/client/v1.14/twilio.js';
          script.async = true;
          script.onload = () => {
            console.log('Twilio script loaded in AppLayout');
            setIsTwilioLoaded(true);
          };
          script.onerror = (e) => {
            console.error('Failed to load Twilio script:', e);
          };
          document.body.appendChild(script);
        } else if (window.Twilio && window.Twilio.Device) {
          // If Twilio is already loaded
          setIsTwilioLoaded(true);
        } else {
          // Script tag exists but Twilio might not be fully loaded
          // Check periodically for Twilio global object
          const checkInterval = setInterval(() => {
            if (window.Twilio && window.Twilio.Device) {
              setIsTwilioLoaded(true);
              clearInterval(checkInterval);
            }
          }, 100);
          
          // Clear interval after 10 seconds to avoid infinite checking
          setTimeout(() => clearInterval(checkInterval), 10000);
        }
      };
      
      loadTwilioScript();
    }
  }, [isTwilioNeededRoute, isTwilioLoaded]);
  
  // Create the content layout that will be wrapped with or without TwilioProvider
  const renderContent = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 w-full">
        <SearchProvider>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 w-full">
                <Navbar />
                <main className="flex-1 p-4">
                  <Outlet />
                </main>
              </div>
              <Suspense fallback={null}>
                <FloatingChatButton />
              </Suspense>
            </div>
          </SidebarProvider>
        </SearchProvider>
    </div>
  );
  
  // Always wrap the entire application with TwilioProvider if on a route that needs it
  // The provider itself will handle checking if Twilio is actually loaded before using it
  if (isTwilioNeededRoute) {
    return (
      <TaskSessionProvider>
        <TwilioProvider>
          {renderContent()}
        </TwilioProvider>
      </TaskSessionProvider>
    );
  }
  
  return renderContent();
};

export default AppLayout;
