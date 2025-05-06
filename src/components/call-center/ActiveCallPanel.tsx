
// src/components/call-center/ActiveCallPanel.tsx
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTwilio } from '@/contexts/TwilioContext';
import {
  PhoneOffIcon,
  MicIcon,
  MicOffIcon,
  MinimizeIcon,
  MaximizeIcon,
  PhoneIcon
} from 'lucide-react';
import PhoneInterface from './PhoneInterface';

const ActiveCallPanel = () => {
  const { callState, endCall, toggleMute } = useTwilio();
  const [isMinimized, setIsMinimized] = useState(false);

  // Don't render anything when no active call
  if (callState.status === 'idle' || callState.status === 'completed') {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="default"
          size="lg"
          className="rounded-full h-14 w-14 bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center"
          onClick={() => setIsMinimized(false)}
        >
          <PhoneIcon className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 right-0 z-40 p-4 md:p-6 max-w-sm w-full">
      <Card className="shadow-lg border-t-4 border-blue-500">
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="font-medium text-lg">
              {callState.status === 'ringing'
                ? callState.direction === 'inbound'
                  ? 'Incoming Call'
                  : 'Calling...'
                : 'In Call'}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
            >
              <MinimizeIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-4">
            <div className="text-xl font-bold">{callState.phoneNumber}</div>
            {callState.status === 'in-progress' && (
              <div className="text-sm text-muted-foreground">
                {formatDuration(callState.duration)}
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            {callState.status === 'in-progress' && (
              <Button
                variant={callState.muted ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={toggleMute}
              >
                {callState.muted ? (
                  <>
                    <MicOffIcon className="h-4 w-4 mr-2" />
                    Unmute
                  </>
                ) : (
                  <>
                    <MicIcon className="h-4 w-4 mr-2" />
                    Mute
                  </>
                )}
              </Button>
            )}

            {(callState.status === 'in-progress' ||
              callState.status === 'ringing') && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={endCall}
              >
                <PhoneOffIcon className="h-4 w-4 mr-2" />
                End Call
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setIsMinimized(false)}
            >
              <MaximizeIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ActiveCallPanel;
