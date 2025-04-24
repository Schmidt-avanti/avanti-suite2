
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Reminder {
  id: string;
  title: string;
  remind_at: string | null;
  completed: boolean;
}

export const useReminders = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReminders = async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('user_reminders')
      .select('*')
      .eq('completed', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reminders:', error);
    } else {
      setReminders(data || []);
    }
    setIsLoading(false);
  };

  const createReminder = async (title: string, remind_at: string | null = null) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_reminders')
      .insert({ 
        user_id: user.id, 
        title, 
        remind_at 
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      return null;
    }

    await fetchReminders();
    return data;
  };

  const completeReminder = async (reminderId: string) => {
    const { error } = await supabase
      .from('user_reminders')
      .update({ completed: true })
      .eq('id', reminderId);

    if (error) {
      console.error('Error completing reminder:', error);
    } else {
      await fetchReminders();
    }
  };

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  return { 
    reminders, 
    isLoading, 
    createReminder, 
    completeReminder,
    refetch: fetchReminders 
  };
};
