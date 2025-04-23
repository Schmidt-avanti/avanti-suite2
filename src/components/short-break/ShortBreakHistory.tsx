
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

export const ShortBreakHistory = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState('all');
  const [limit, setLimit] = useState(5);

  const { data: breaks, isLoading } = useQuery({
    queryKey: ['user-break-history', user?.id, status, limit],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('short_breaks')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });
      
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.limit(limit);
      
      if (error) {
        console.error('Error fetching user breaks:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user
  });

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
                  {new Date(breakItem.start_time).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </TableCell>
                <TableCell>
                  {breakItem.duration ? 
                    breakItem.duration < 60 ?
                      `${breakItem.duration} Sek.` :
                      `${Math.round(breakItem.duration / 60)} Min.` : 
                    '-'
                  }
                </TableCell>
                <TableCell>
                  {breakItem.status === 'completed' ? 'Beendet' : 
                   breakItem.status === 'active' ? 'Aktiv' : 
                   'Abgebrochen'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
