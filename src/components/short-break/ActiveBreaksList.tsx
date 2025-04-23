
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

export const ActiveBreaksList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activeBreaks } = useQuery({
    queryKey: ['active-breaks-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('short_breaks')
        .select(`
          *,
          profiles:user_id (
            "Full Name"
          )
        `)
        .eq('status', 'active')
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const endBreak = useMutation({
    mutationFn: async (breakId: string) => {
      const duration = Math.floor((Date.now() - new Date(activeBreaks?.find(b => b.id === breakId)?.start_time || '').getTime()) / 1000);
      
      const { error } = await supabase
        .from('short_breaks')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          duration
        })
        .eq('id', breakId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-breaks-list'] });
      toast({
        title: "Pause beendet",
        description: "Die Pause wurde manuell beendet."
      });
    }
  });

  if (!activeBreaks?.length) {
    return (
      <div className="text-sm text-muted-foreground mt-4">
        Aktuell sind keine aktiven Pausen vorhanden.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium mb-3">Aktive Pausen</h3>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Laufzeit</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeBreaks.map((breakItem) => (
              <TableRow key={breakItem.id}>
                <TableCell>
                  {breakItem.profiles?.["Full Name"]}
                </TableCell>
                <TableCell>
                  {new Date(breakItem.start_time).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </TableCell>
                <TableCell>
                  {Math.floor((Date.now() - new Date(breakItem.start_time).getTime()) / 1000)} Sek.
                </TableCell>
                <TableCell>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => endBreak.mutate(breakItem.id)}
                    disabled={endBreak.isPending}
                  >
                    Beenden
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
