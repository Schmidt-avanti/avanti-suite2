
// src/components/layout/AppLayout.tsx
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import AppSidebar from './AppSidebar';
import { TwilioProvider } from '@/contexts/TwilioContext';
import ActiveCallPanel from '@/components/call-center/ActiveCallPanel';
import { Suspense, lazy, useState, useEffect } from 'react';

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
        } else {
          setIsTwilioLoaded(true);
        }
      };
      
      loadTwilioScript();
    }
  }, [isTwilioNeededRoute, isTwilioLoaded]);
    
  // Create a layout with or without Twilio Provider based on route
  const renderContent = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="flex min-h-screen">
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
        {isTwilioNeededRoute && isTwilioLoaded && <ActiveCallPanel />}
      </div>
    </div>
  );
  
  // Conditionally wrap in TwilioProvider only when needed and script is loaded
  if (isTwilioNeededRoute && isTwilioLoaded) {
    return (
      <TwilioProvider>
        {renderContent()}
      </TwilioProvider>
    );
  }
  
  return renderContent();
};

export default AppLayout;
