
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface CustomerAssignment {
  id: string;
  user_id: string;
  customer_id: string;
  customer_name?: string;
}

export const useUserAssignments = (userId?: string) => {
  const [assignments, setAssignments] = useState<CustomerAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        
        // Use either provided userId or current user's ID
        const targetUserId = userId || user?.id;
        
        if (!targetUserId) {
          setAssignments([]);
          return;
        }

        console.log('Fetching assignments for user ID:', targetUserId);
        
        // Fetch assignments with customer details
        const { data, error } = await supabase
          .from('user_customer_assignments')
          .select(`
            id, 
            user_id,
            customer_id,
            customers:customer_id(name)
          `)
          .eq('user_id', targetUserId);

        if (error) {
          console.error('Error fetching user assignments:', error);
          toast({
            variant: "destructive",
            title: "Fehler beim Laden der Kundenzuweisungen",
            description: error.message,
          });
          setAssignments([]);
          return;
        }

        // Transform data to include customer name
        const formattedAssignments = data.map(assignment => ({
          id: assignment.id,
          user_id: assignment.user_id,
          customer_id: assignment.customer_id,
          customer_name: assignment.customers?.name
        }));
        
        console.log('User assignments:', formattedAssignments);
        setAssignments(formattedAssignments);
      } catch (error: any) {
        console.error('Unexpected error in useUserAssignments:', error);
        toast({
          variant: "destructive",
          title: "Unerwarteter Fehler",
          description: error.message,
        });
        setAssignments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignments();
  }, [user, userId, toast]);

  return { assignments, isLoading };
};
