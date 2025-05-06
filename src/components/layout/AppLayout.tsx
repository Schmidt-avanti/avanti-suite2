
// src/components/layout/AppLayout.tsx
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import AppSidebar from './AppSidebar';
import { TwilioProvider } from '@/contexts/TwilioContext';
import ActiveCallPanel from '@/components/call-center/ActiveCallPanel';
import { Suspense, lazy } from 'react';

// Lazy load components that might not be needed immediately
const FloatingChatButton = lazy(() =>
  import('@/components/floating-chat/FloatingChatButton')
);

const AppLayout = () => {
  const location = useLocation();
  
  // Check if we're on routes that need Twilio
  const isTwilioNeededRoute = 
    location.pathname === '/call-center' || 
    location.pathname.startsWith('/tasks/') ||
    location.pathname === '/tasks';
    
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
        {isTwilioNeededRoute && <ActiveCallPanel />}
      </div>
    </div>
  );
  
  // Conditionally wrap in TwilioProvider only when needed
  if (isTwilioNeededRoute) {
    return (
      <TwilioProvider>
        {renderContent()}
      </TwilioProvider>
    );
  }
  
  return renderContent();
};

export default AppLayout;
