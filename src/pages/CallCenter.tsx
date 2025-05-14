
// src/pages/CallCenter.tsx
import React from 'react';
import PhoneInterface from '@/components/call-center/PhoneInterface';
import VoiceStatusButton from '@/components/call-center/VoiceStatusButton';
import CallHistoryList from '@/components/call-center/CallHistoryList';
import TwilioSetupStatus from '@/components/call-center/TwilioSetupStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from '@/components/ui/card';
import { useTwilio } from '@/contexts/TwilioContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ActiveCallPanel from '@/components/call-center/ActiveCallPanel';

const CallCenter: React.FC = () => {
  const { isSetup, setupTwilio } = useTwilio();
  const [activeTab, setActiveTab] = React.useState('dialer');
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Call Center</h1>
      
      <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
        <VoiceStatusButton />
      </div>
      
      {!isSetup && (
        <Alert className="mb-6">
          <InfoIcon className="h-5 w-5" />
          <AlertTitle>Telefonsystem nicht initialisiert</AlertTitle>
          <AlertDescription>
            Das Telefonsystem muss initialisiert werden, bevor Sie Anrufe tätigen oder empfangen können.
            Bitte stellen Sie sicher, dass Ihr Browser den Zugriff auf das Mikrofon erlaubt.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dialer">Dialer</TabsTrigger>
              <TabsTrigger value="history">Anrufhistorie</TabsTrigger>
            </TabsList>
            <TabsContent value="dialer">
              <div className="flex justify-center mt-4">
                <div className="w-full max-w-md">
                  <PhoneInterface />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="history">
              <div className="mt-4">
                <CallHistoryList />
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="lg:col-span-2">
          <TwilioSetupStatus />
        </div>
      </div>
      
      {/* This component will show when there's an active call */}
      <ActiveCallPanel />
    </div>
  );
};

export default CallCenter;
