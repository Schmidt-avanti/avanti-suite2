
// src/contexts/TwilioContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import twilioService, { CallState } from '@/services/TwilioService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface TwilioContextType {
  callState: CallState;
  isAvailable: boolean;
  isSetup: boolean;
  setupTwilio: () => Promise<boolean>;
  makeCall: (phoneNumber: string, params?: any) => Promise<boolean>;
  acceptIncomingCall: () => boolean;
  rejectIncomingCall: () => boolean;
  endCall: () => boolean;
  toggleMute: () => boolean;
  sendDigit: (digit: string) => boolean;
  toggleAvailability: () => Promise<boolean>;
}

const TwilioContext = createContext<TwilioContextType | null>(null);

export const TwilioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [callState, setCallState] = useState<CallState>(twilioService.getCallState());
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isSetup, setIsSetup] = useState<boolean>(false);
  
  // Set up Twilio device and subscribe to events
  const setupTwilio = useCallback(async () => {
    if (!user) return false;
    
    try {
      // Make sure worker is registered
      await twilioService.registerWorker();
      
      // Set up the device
      const success = await twilioService.setupDevice();
      setIsSetup(success);
      return success;
    } catch (error) {
      console.error('Error setting up Twilio:', error);
      toast({
        title: 'Twilio Setup Error',
        description: `Failed to set up Twilio: ${error.message}`,
        variant: 'destructive'
      });
      return false;
    }
  }, [user, toast]);
  
  // Toggle agent availability for calls
  const toggleAvailability = useCallback(async () => {
    const newStatus = isAvailable ? 'offline' : 'available';
    const success = await twilioService.updateVoiceStatus(newStatus);
    
    if (success) {
      setIsAvailable(!isAvailable);
      toast({
        title: 'Status Updated',
        description: `You are now ${newStatus} for calls.`,
      });
    } else {
      toast({
        title: 'Status Update Failed',
        description: 'Failed to update your availability status.',
        variant: 'destructive'
      });
    }
    
    return success;
  }, [isAvailable, toast]);
  
  // Fetch initial availability status from profile
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!user) return;
      
      try {
        const { data: profile, error } = await twilioService['supabase']
          .from('profiles')
          .select('voice_status')
          .eq('id', user.id)
          .single();
          
        if (!error && profile) {
          setIsAvailable(profile.voice_status === 'available');
        }
      } catch (error) {
        console.error('Error fetching voice status:', error);
      }
    };
    
    fetchAvailability();
  }, [user]);
  
  // Subscribe to call state changes
  useEffect(() => {
    const unsubscribe = twilioService.onCallStateChange(newState => {
      setCallState(newState);
      
      // Show toasts for call status changes
      if (newState.status === 'ringing' && newState.direction === 'inbound') {
        toast({
          title: 'Incoming Call',
          description: `Call from ${newState.phoneNumber}`,
          duration: 10000,
        });
      } else if (newState.status === 'completed') {
        toast({
          title: 'Call Ended',
          description: `Call duration: ${formatDuration(newState.duration)}`,
        });
      } else if (newState.status === 'failed') {
        toast({
          title: 'Call Failed',
          description: newState.error || 'Unknown error',
          variant: 'destructive'
        });
      }
      
      // Navigate to task if there's a linked task
      if (newState.status === 'in-progress' && newState.callSid) {
        checkForLinkedTask(newState.callSid);
      }
    });
    
    return unsubscribe;
  }, [toast, navigate]);
  
  // Helper function to check for a task linked to this call
  const checkForLinkedTask = useCallback(async (callSid: string) => {
    try {
      const { data, error } = await twilioService['supabase']
        .from('call_sessions')
        .select('task_id')
        .eq('call_sid', callSid)
        .not('task_id', 'is', null)
        .single();
        
      if (!error && data?.task_id) {
        navigate(`/tasks/${data.task_id}`);
      }
    } catch (error) {
      console.error('Error checking for linked task:', error);
    }
  }, [navigate]);
  
  // Helper function to format duration in MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const value = {
    callState,
    isAvailable,
    isSetup,
    setupTwilio,
    makeCall: (phoneNumber: string, params?: any) => twilioService.makeCall(phoneNumber, params),
    acceptIncomingCall: () => twilioService.acceptIncomingCall(),
    rejectIncomingCall: () => twilioService.rejectIncomingCall(),
    endCall: () => twilioService.endCall(),
    toggleMute: () => twilioService.toggleMute(),
    sendDigit: (digit: string) => twilioService.sendDigit(digit),
    toggleAvailability
  };
  
  return <TwilioContext.Provider value={value}>{children}</TwilioContext.Provider>;
};

export const useTwilio = () => {
  const context = useContext(TwilioContext);
  if (!context) {
    throw new Error('useTwilio must be used within a TwilioProvider');
  }
  return context;
};
