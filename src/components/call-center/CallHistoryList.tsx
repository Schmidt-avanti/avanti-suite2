
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
import { PhoneIcon, PhoneIncoming, PhoneOutgoing, Building } from 'lucide-react';
import { useTwilio } from '@/contexts/TwilioContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  twilio_phone_number?: {
    phone_number: string;
    friendly_name: string;
  }
}

const CallHistoryList: React.FC = () => {
  const { user } = useAuth();
  const { makeCall } = useTwilio();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user]);
  
  useEffect(() => {
    fetchCalls();
  }, [user, filter, customerFilter]);

  const fetchCustomers = async () => {
    try {
      let query = supabase.from('customers').select('id, name').order('name');
      
      // If not admin, only fetch assigned customers
      if (user?.role !== 'admin') {
        const { data: assignments } = await supabase
          .from('user_customer_assignments')
          .select('customer_id')
          .eq('user_id', user.id);
          
        if (assignments && assignments.length > 0) {
          const customerIds = assignments.map(a => a.customer_id);
          query = query.in('id', customerIds);
        }
      }
      
      const { data } = await query;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCalls = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      let query = supabase
        .from('call_sessions')
        .select(`
          *,
          customer:customer_id (*),
          endkunde:endkunde_id (*),
          twilio_phone_number:twilio_phone_number_id (phone_number, friendly_name)
        `);

      // Apply filters
      if (filter === 'incoming') {
        query = query.eq('direction', 'inbound');
      } else if (filter === 'outgoing') {
        query = query.eq('direction', 'outbound');
      }
      
      if (customerFilter !== 'all') {
        query = query.eq('customer_id', customerFilter);
      }
      
      // If not admin, only show calls for assigned agent
      if (user.role !== 'admin') {
        query = query.eq('agent_id', user.id);
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      setCalls(data || []);
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
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
      case 'assigned':
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Call History</CardTitle>
        <div className="flex space-x-2">
          <Select value={filter} onValueChange={(value: 'all' | 'incoming' | 'outgoing') => setFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              <SelectItem value="incoming">Incoming</SelectItem>
              <SelectItem value="outgoing">Outgoing</SelectItem>
            </SelectContent>
          </Select>
          
          {customers.length > 0 && (
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Button variant="outline" size="sm" onClick={fetchCalls}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="w-full h-12" />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No call history available</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Direction</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone Number</TableHead>
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
                    {call.customer ? (
                      <div className="flex items-center">
                        <Building className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span>{call.customer.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {call.twilio_phone_number ? (
                      <div>
                        <div className="text-sm">{call.twilio_phone_number.phone_number}</div>
                        <div className="text-xs text-muted-foreground">{call.twilio_phone_number.friendly_name}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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
