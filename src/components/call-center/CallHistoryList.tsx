
// src/components/call-center/CallHistoryList.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { PhoneIcon, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { useTwilio } from '@/contexts/TwilioContext';
import { Badge } from '@/components/ui/badge';

interface CallSession {
  id: string;
  call_sid: string;
  agent_id: string;
  customer_id: string;
  endkunde_id: string;
  status: string;
  direction: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  endkunde_phone: string;
  created_at: string;
  customer?: {
    name: string;
  };
  endkunde?: {
    Vorname: string;
    Nachname: string;
  };
}

const CallHistoryList: React.FC = () => {
  const { user } = useAuth();
  const { makeCall } = useTwilio();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCalls = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('call_sessions')
          .select(`
            *,
            customer:customer_id (*),
            endkunde:endkunde_id (*)
          `)
          .eq('agent_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (error) throw error;
        
        setCalls(data || []);
      } catch (error) {
        console.error('Error fetching call history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCalls();
    
    // Set up a subscription for real-time updates
    const channel = supabase
      .channel('call_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_sessions',
          filter: `agent_id=eq.${user?.id}`
        },
        fetchCalls
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getCallerName = (call: CallSession) => {
    if (call.endkunde?.Vorname || call.endkunde?.Nachname) {
      return `${call.endkunde.Vorname || ''} ${call.endkunde.Nachname || ''}`.trim();
    }
    
    if (call.customer?.name) {
      return call.customer.name;
    }
    
    return call.endkunde_phone || 'Unknown';
  };
  
  const handleCallBack = (phoneNumber: string) => {
    if (!phoneNumber) return;
    makeCall(phoneNumber);
  };
  
  const renderStatusBadge = (status: string) => {
    let variant = 'outline';
    
    switch (status.toLowerCase()) {
      case 'completed':
        variant = 'default';
        break;
      case 'in-progress':
        variant = 'success';
        break;
      case 'ringing':
        variant = 'warning';
        break;
      case 'failed':
        variant = 'destructive';
        break;
      default:
        variant = 'outline';
    }
    
    return <Badge variant={variant as any}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Calls</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">Loading call history...</div>
        ) : calls.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No call history available</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Direction</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>
                    {call.direction === 'inbound' ? (
                      <PhoneIncoming className="h-4 w-4 text-blue-500" />
                    ) : (
                      <PhoneOutgoing className="h-4 w-4 text-green-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{getCallerName(call)}</div>
                    <div className="text-xs text-muted-foreground">{call.endkunde_phone}</div>
                  </TableCell>
                  <TableCell>
                    <div>{format(new Date(call.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(call.created_at), { addSuffix: true, locale: de })}
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                  <TableCell>{renderStatusBadge(call.status)}</TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCallBack(call.endkunde_phone)}
                    >
                      <PhoneIcon className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CallHistoryList;
