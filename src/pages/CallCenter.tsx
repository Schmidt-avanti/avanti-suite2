
// src/pages/CallCenter.tsx
import React, { useEffect } from 'react';
import PhoneInterface from '@/components/call-center/PhoneInterface';
import VoiceStatusButton from '@/components/call-center/VoiceStatusButton';
import CallHistoryList from '@/components/call-center/CallHistoryList';
import TwilioSetupStatus from '@/components/call-center/TwilioSetupStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, Loader2 } from 'lucide-react';
import { useTwilio } from '@/contexts/TwilioContext';
import { useAuth } from '@/contexts/AuthContext';
import PhoneNumberSetup from '@/components/call-center/PhoneNumberSetup';
import ActiveCallPanel from '@/components/call-center/ActiveCallPanel';

const CallCenter: React.FC = () => {
  const { isSetup, setupTwilio } = useTwilio();
  const [activeTab, setActiveTab] = React.useState('dialer');
  const [isLoading, setIsLoading] = React.useState(true);
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  
  useEffect(() => {
    // Check if Twilio is loaded and set up
    const checkTwilioSetup = async () => {
      try {
        if (!isSetup && window.Twilio && window.Twilio.Device) {
          await setupTwilio();
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error setting up Twilio:", error);
        setIsLoading(false);
      }
    };
    
    checkTwilioSetup();
  }, [isSetup, setupTwilio]);
  
  // Show a loading indicator while we're initializing
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-lg font-medium">Twilio wird initialisiert...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex flex-col space-y-6">
        {/* Header Section with Title and Status */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-card rounded-lg p-4 border shadow-sm">
          <h1 className="text-2xl font-bold">Call Center</h1>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <VoiceStatusButton />
            {isAdmin && (
              <TwilioSetupStatus />
            )}
          </div>
        </div>
        
        {/* Alert Section - Only shown when needed */}
        {!isSetup && (
          <Alert variant="destructive" className="mb-2">
            <InfoIcon className="h-5 w-5" />
            <AlertTitle>Telefonsystem nicht initialisiert</AlertTitle>
            <AlertDescription>
              Das Telefonsystem muss initialisiert werden, bevor Sie Anrufe tätigen oder empfangen können.
              Bitte stellen Sie sicher, dass Ihr Browser den Zugriff auf das Mikrofon erlaubt.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Dialer and History */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="dialer">Dialer</TabsTrigger>
                  <TabsTrigger value="history">Anrufhistorie</TabsTrigger>
                </TabsList>
                <TabsContent value="dialer">
                  <div className="flex justify-center">
                    <div className="w-full max-w-md">
                      <PhoneInterface />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="history">
                  <div className="max-h-[500px] overflow-y-auto">
                    <CallHistoryList />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Quick Actions Section */}
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <h3 className="font-medium text-lg mb-3">Schnellzugriff</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button 
                  className="flex flex-col items-center justify-center p-3 rounded-md border hover:bg-accent transition-colors"
                  onClick={() => setActiveTab('dialer')}
                >
                  <span className="text-2xl">📞</span>
                  <span className="text-sm mt-1">Anruf tätigen</span>
                </button>
                <button 
                  className="flex flex-col items-center justify-center p-3 rounded-md border hover:bg-accent transition-colors"
                  onClick={() => setActiveTab('history')}
                >
                  <span className="text-2xl">📋</span>
                  <span className="text-sm mt-1">Historie</span>
                </button>
                <button 
                  className="flex flex-col items-center justify-center p-3 rounded-md border hover:bg-accent transition-colors"
                >
                  <span className="text-2xl">🔄</span>
                  <span className="text-sm mt-1">Aktualisieren</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Right Column - Setup and Settings */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <h3 className="font-medium text-lg mb-3">Systemstatus</h3>
              <TwilioSetupStatus />
            </div>
            
            {isAdmin && (
              <div className="bg-card rounded-lg p-4 border shadow-sm">
                <h3 className="font-medium text-lg mb-3">Admin-Einstellungen</h3>
                <PhoneNumberSetup />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Active Call Panel */}
      <ActiveCallPanel />
    </div>
  );
};

export default CallCenter;
