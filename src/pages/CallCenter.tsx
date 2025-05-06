
// src/pages/CallCenter.tsx
import React, { useState } from 'react';
import PhoneInterface from '@/components/call-center/PhoneInterface';
import VoiceStatusButton from '@/components/call-center/VoiceStatusButton';
import CallHistoryList from '@/components/call-center/CallHistoryList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from '@/components/ui/card';
import { useTwilio } from '@/contexts/TwilioContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

const CallCenter: React.FC = () => {
  const { isSetup, setupTwilio } = useTwilio();
  const [activeTab, setActiveTab] = useState('dialer');
  
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Call Center</h1>
      
      <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
        <VoiceStatusButton />
      </div>
      
      {!isSetup && (
        <Alert className="mb-6">
          <InfoIcon className="h-5 w-5" />
          <AlertTitle>Phone system not initialized</AlertTitle>
          <AlertDescription>
            The phone system needs to be initialized before you can make or receive calls.
            Please make sure your browser allows microphone access.
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dialer">Dialer</TabsTrigger>
          <TabsTrigger value="history">Call History</TabsTrigger>
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
  );
};

export default CallCenter;
