
// src/components/call-center/PhoneInterface.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useTwilio } from '@/contexts/TwilioContext';
import { 
  PhoneIcon, PhoneOffIcon, MicIcon, MicOffIcon, 
  Hash, X as CloseIcon
} from 'lucide-react';

interface PhoneInterfaceProps {
  onClose?: () => void;
  initialPhoneNumber?: string;
  customerName?: string;
}

const PhoneInterface: React.FC<PhoneInterfaceProps> = ({ 
  onClose, 
  initialPhoneNumber = '',
  customerName
}) => {
  const { 
    callState, 
    makeCall, 
    endCall, 
    toggleMute, 
    sendDigit,
    acceptIncomingCall,
    rejectIncomingCall
  } = useTwilio();
  
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [isDialpadOpen, setIsDialpadOpen] = useState(false);
  
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
  };
  
  const handleCall = () => {
    if (callState.status === 'idle') {
      makeCall(phoneNumber);
    } else {
      endCall();
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && callState.status === 'idle') {
      handleCall();
    }
  };
  
  const handleDigitPress = (digit: string) => {
    if (callState.status === 'in-progress') {
      sendDigit(digit);
    } else {
      setPhoneNumber(prev => prev + digit);
    }
  };
  
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getStatusDisplay = () => {
    switch (callState.status) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return callState.direction === 'inbound' ? 'Incoming Call' : 'Ringing...';
      case 'in-progress':
        return `Call in Progress - ${formatCallDuration(callState.duration)}`;
      case 'completed':
        return 'Call Ended';
      case 'failed':
        return 'Call Failed';
      default:
        return '';
    }
  };
  
  const renderDialpad = () => (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digit => (
        <Button
          key={digit}
          variant="outline"
          className="h-12"
          onClick={() => handleDigitPress(digit)}
        >
          {digit}
        </Button>
      ))}
    </div>
  );
  
  const renderIncomingCallControls = () => (
    <div className="flex justify-center space-x-4 my-4">
      <Button 
        variant="destructive"
        className="rounded-full w-12 h-12 p-0"
        onClick={() => rejectIncomingCall()}
      >
        <PhoneOffIcon className="h-5 w-5" />
      </Button>
      <Button 
        variant="default"
        className="rounded-full w-12 h-12 p-0 bg-green-500 hover:bg-green-600"
        onClick={() => acceptIncomingCall()}
      >
        <PhoneIcon className="h-5 w-5" />
      </Button>
    </div>
  );
  
  const renderActiveCallControls = () => (
    <div className="flex justify-center space-x-4 my-4">
      <Button 
        variant="outline"
        className={`rounded-full w-12 h-12 p-0 ${callState.muted ? 'bg-red-100' : ''}`}
        onClick={() => toggleMute()}
      >
        {callState.muted ? (
          <MicOffIcon className="h-5 w-5 text-red-600" />
        ) : (
          <MicIcon className="h-5 w-5" />
        )}
      </Button>
      <Button 
        variant="outline"
        className="rounded-full w-12 h-12 p-0"
        onClick={() => setIsDialpadOpen(!isDialpadOpen)}
      >
        <Hash className="h-5 w-5" />
      </Button>
      <Button 
        variant="destructive"
        className="rounded-full w-12 h-12 p-0"
        onClick={() => endCall()}
      >
        <PhoneOffIcon className="h-5 w-5" />
      </Button>
    </div>
  );
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Phone</CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <CloseIcon className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status display */}
          {getStatusDisplay() && (
            <div className="text-center font-medium">
              {getStatusDisplay()}
            </div>
          )}
          
          {/* Caller/callee information */}
          <div className="text-center">
            {callState.status !== 'idle' ? (
              <div className="mb-2">
                <div className="text-lg font-semibold">
                  {customerName || callState.phoneNumber}
                </div>
                {customerName && <div className="text-sm text-muted-foreground">{callState.phoneNumber}</div>}
              </div>
            ) : (
              <Input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter phone number"
                className="mb-2"
              />
            )}
          </div>
          
          {/* Call controls based on status */}
          {callState.status === 'idle' ? (
            <div className="flex justify-center">
              <Button 
                variant="default"
                className="rounded-full w-12 h-12 p-0 bg-green-500 hover:bg-green-600"
                onClick={handleCall}
                disabled={!phoneNumber.trim()}
              >
                <PhoneIcon className="h-5 w-5" />
              </Button>
            </div>
          ) : callState.status === 'ringing' && callState.direction === 'inbound' ? (
            renderIncomingCallControls()
          ) : (
            renderActiveCallControls()
          )}
          
          {/* Dialpad */}
          {isDialpadOpen && renderDialpad()}
        </div>
      </CardContent>
      {callState.status === 'idle' && (
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setIsDialpadOpen(!isDialpadOpen)}
          >
            {isDialpadOpen ? 'Hide Dialpad' : 'Show Dialpad'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default PhoneInterface;
