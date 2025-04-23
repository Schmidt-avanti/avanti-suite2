
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

export const ShortBreakHistory = () => {
  const { user } = useAuth();

  const { data: breaks } = useQuery({
    queryKey: ['user-break-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('short_breaks')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_time', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  if (!breaks?.length) return null;

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium mb-3">Deine letzten Pausen</h3>
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
                    minute: '2-digit' 
                  })}
                </TableCell>
                <TableCell>
                  {breakItem.duration ? 
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
};
