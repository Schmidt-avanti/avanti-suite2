
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
    
    try {
      console.log('Fetching reminders for user:', user.id);
      
      // Use the raw query method with explicit type casting
      const { data, error } = await supabase
        .from('user_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reminders:', error);
      } else {
        console.log('Fetched reminders:', data);
        // Cast the data to our Reminder interface
        setReminders((data || []) as Reminder[]);
      }
    } catch (err) {
      console.error('Exception when fetching reminders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createReminder = async (title: string, remind_at: string | null = null) => {
    if (!user) return null;

    try {
      // Use the raw query method with explicit typing
      const { data, error } = await supabase
        .from('user_reminders')
        .insert({ 
          user_id: user.id, 
          title, 
          remind_at 
        })
        .select();

      if (error) {
        console.error('Error creating reminder:', error);
        return null;
      }

      await fetchReminders();
      return data[0] as Reminder;
    } catch (err) {
      console.error('Exception when creating reminder:', err);
      return null;
    }
  };

  const completeReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('user_reminders')
        .update({ completed: true })
        .eq('id', reminderId);

      if (error) {
        console.error('Error completing reminder:', error);
      } else {
        await fetchReminders();
      }
    } catch (err) {
      console.error('Exception when completing reminder:', err);
    }
  };

  const deleteReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('user_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) {
        console.error('Error deleting reminder:', error);
      } else {
        await fetchReminders();
      }
    } catch (err) {
      console.error('Exception when deleting reminder:', err);
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
    deleteReminder,
    refetch: fetchReminders 
  };
};
