
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useShortBreaks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings } = useQuery({
    queryKey: ['short-break-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('short_break_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: activeBreaks } = useQuery({
    queryKey: ['active-breaks'],
    queryFn: async () => {
      const { data: activeSlots } = await supabase.rpc('get_active_break_slots');
      const { data: availableMinutes } = await supabase.rpc('get_available_break_minutes', {
        user_id_param: user?.id
      });

      return {
        activeSlots,
        maxSlots: settings?.max_slots || 5,
        availableMinutes
      };
    },
    enabled: !!settings && !!user,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const startBreak = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('short_breaks')
        .insert({
          user_id: user?.id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-breaks'] });
      toast({
        title: "Pause gestartet",
        description: "Deine 5-Minuten Pause läuft jetzt."
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Pause konnte nicht gestartet werden",
        variant: "destructive"
      });
    }
  });

  return {
    settings,
    activeBreaks,
    startBreak
  };
};
