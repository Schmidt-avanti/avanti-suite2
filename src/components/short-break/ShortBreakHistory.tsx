
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface ShortBreak {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export const ShortBreakHistory = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState('all');
  const [limit, setLimit] = useState(5);

  const { data: breaks, isLoading } = useQuery({
    queryKey: ['user-break-history', user?.id, status, limit],
    queryFn: async () => {
      if (!user?.id) {
        console.log('No user ID available for fetching breaks');
        return [];
      }
      
      try {
        console.log(`Fetching breaks for user ${user.id} with status ${status} and limit ${limit}`);
        
        // Build query - directly get all break data without any joins
        let query = supabase
          .from('short_breaks')
          .select('*')
          .eq('user_id', user.id)
          .order('start_time', { ascending: false });
        
        // Apply filters
        if (status !== 'all') {
          query = query.eq('status', status);
        }
        
        // Apply limit
        query = query.limit(limit);
        
        // Execute query
        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching user breaks:', error);
          throw error;
        }
        
        console.log('Fetched user breaks successfully:', data?.length);
        return data as ShortBreak[] || [];
      } catch (err) {
        console.error('Exception in user breaks query:', err);
        throw err;
      }
    },
    enabled: !!user
  });

  // Format break duration
  const formatDuration = (duration) => {
    if (!duration) return '-';
    
    return duration < 60
      ? `${duration} Sek.`
      : `${Math.round(duration / 60)} Min.`;
  };

  // Format break status
  const formatStatus = (status) => {
    switch (status) {
      case 'completed': return 'Beendet';
      case 'active': return 'Aktiv';
      case 'cancelled': return 'Abgebrochen';
      default: return status;
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground mt-3">Daten werden geladen...</div>;
  }

  if (!breaks?.length) {
    return <div className="text-sm text-muted-foreground mt-3">Keine Pausendaten verfügbar.</div>;
  }

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(parseInt(newLimit));
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Deine letzten Pausen</h3>
        <div className="flex gap-2">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="completed">Beendet</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="cancelled">Abgebrochen</SelectItem>
            </SelectContent>
          </Select>

          <Select value={limit.toString()} onValueChange={handleLimitChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Anzahl" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 Einträge</SelectItem>
              <SelectItem value="10">10 Einträge</SelectItem>
              <SelectItem value="20">20 Einträge</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Start</TableHead>
              <TableHead>Dauer</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breaks.map((breakItem) => (
              <TableRow key={breakItem.id}>
                <TableCell>
                  {new Date(breakItem.start_time).toLocaleTimeString('de-DE', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </TableCell>
                <TableCell>
                  {formatDuration(breakItem.duration)}
                </TableCell>
                <TableCell>
                  {formatStatus(breakItem.status)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
