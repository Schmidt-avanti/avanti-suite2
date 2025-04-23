
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useState } from 'react';
import { ActiveBreaksList } from '@/components/short-break/ActiveBreaksList';

export default function ShortBreakSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [maxSlots, setMaxSlots] = useState('5');
  const [dailyMinutes, setDailyMinutes] = useState('20');

  const { data: settings } = useQuery({
    queryKey: ['short-break-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('short_break_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      
      setMaxSlots(data.max_slots.toString());
      setDailyMinutes(data.daily_minutes_per_agent.toString());
      
      return data;
    }
  });

  const { data: breaks } = useQuery({
    queryKey: ['break-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('short_breaks')
        .select(`
          *,
          profiles:user_id (
            "Full Name",
            role
          )
        `)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const updateSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('short_break_settings')
        .update({
          max_slots: parseInt(maxSlots),
          daily_minutes_per_agent: parseInt(dailyMinutes)
        })
        .eq('id', settings?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-break-settings'] });
      toast({
        title: "Einstellungen aktualisiert",
        description: "Die Short-Break Einstellungen wurden gespeichert."
      });
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Short-Break Einstellungen</h2>
        
        <div className="grid gap-4 max-w-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Maximale gleichzeitige Pausenslots
            </label>
            <Input 
              type="number" 
              value={maxSlots}
              onChange={e => setMaxSlots(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tägliche Pausenminuten pro Agent
            </label>
            <Input 
              type="number"
              value={dailyMinutes}
              onChange={e => setDailyMinutes(e.target.value)}
            />
          </div>
          
          <Button onClick={() => updateSettings.mutate()}>
            Einstellungen speichern
          </Button>
        </div>
      </div>

      <ActiveBreaksList />

      <div>
        <h3 className="text-lg font-semibold mb-4">Pausenhistorie</h3>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Ende</TableHead>
                <TableHead>Dauer</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breaks?.map((breakItem) => (
                <TableRow key={breakItem.id}>
                  <TableCell>
                    {breakItem.profiles?.["Full Name"]}
                  </TableCell>
                  <TableCell>
                    {new Date(breakItem.start_time).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {breakItem.end_time ? 
                      new Date(breakItem.end_time).toLocaleString() : 
                      '-'
                    }
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
    </div>
  );
}
