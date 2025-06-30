
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Customer } from '@/types';
import { useToast } from '@/components/ui/use-toast';

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        
        if (!user) {
          console.log('useCustomers: No user found, skipping fetch');
          setCustomers([]);
          setIsLoading(false);
          return;
        }

        console.log(`useCustomers: Fetching customers for user ${user.id} with role ${user.role}`);
        
        // For agents, fetch assigned customers
        if (user.role === 'agent') {
          console.log('useCustomers: User is an agent, fetching assigned customers');
          
          const { data: assignedCustomers, error: assignmentError } = await supabase
            .from('user_customer_assignments')
            .select('customer_id, customers(id, name, branch, is_active, industry)')
            .eq('user_id', user.id);

          if (assignmentError) {
            console.error('Error fetching assigned customers:', assignmentError);
            toast({
              variant: "destructive",
              title: "Fehler beim Laden der zugewiesenen Kunden",
              description: assignmentError.message,
            });
            setCustomers([]);
            return;
          }

          console.log('useCustomers: Agent assigned customers data:', assignedCustomers);

          if (assignedCustomers && assignedCustomers.length > 0) {
            const mappedCustomers = assignedCustomers
              .filter(ac => ac.customers)
              .map(ac => ({
                id: ac.customers.id,
                name: ac.customers.name,
                branch: ac.customers.branch,
                is_active: ac.customers.is_active,
                industry: ac.customers.industry,
                created_at: '' // We set an empty date, as it's not needed here
              }));
              
            console.log('useCustomers: Mapped customer data for agent:', mappedCustomers);
            setCustomers(mappedCustomers);
          } else {
            console.log('useCustomers: No customer assignments found for agent');
            setCustomers([]);
          }
        } 
        // For clients, fetch their own customer
        else if (user.role === 'customer') {
          console.log('useCustomers: User is a customer, fetching assigned customer');
          
          const { data: userAssignment, error: clientError } = await supabase
            .from('user_customer_assignments')
            .select('customer_id, customers(id, name, branch, is_active, industry)')
            .eq('user_id', user.id)
            .single();

          if (clientError) {
            console.error('Error fetching customer assignment:', clientError);
            toast({
              variant: "destructive",
              title: "Fehler beim Laden der Kundenzuweisung",
              description: clientError.message,
            });
            setCustomers([]);
            return;
          }

          console.log('useCustomers: Customer assignment data:', userAssignment);

          if (userAssignment && userAssignment.customers) {
            setCustomers([{
              id: userAssignment.customers.id,
              name: userAssignment.customers.name,
              branch: userAssignment.customers.branch,
              is_active: userAssignment.customers.is_active,
              industry: userAssignment.customers.industry,
              created_at: '' // We set an empty date, as it's not needed here
            }]);
          } else {
            console.log('useCustomers: No customer assignment found for customer');
            setCustomers([]);
          }
        } 
        // For admins, fetch all customers
        else {
          console.log('useCustomers: User is an admin or supervisor, fetching all customers');

          const { data: allCustomers, error: adminError } = await supabase
            .from('customers')
            .select('id, name, branch, is_active, created_at, industry')
            .order('name');

          if (adminError) {
            console.error('Error fetching all customers:', adminError);
            toast({
              variant: "destructive",
              title: "Fehler beim Laden der Kunden",
              description: adminError.message,
            });
            setCustomers([]);
            return;
          }

          console.log('useCustomers: Admin customers data count:', allCustomers?.length || 0);

          if (allCustomers) {
            const formattedCustomers = allCustomers.map(customer => ({
              id: customer.id,
              name: customer.name,
              branch: customer.branch,
              is_active: customer.is_active,
              industry: customer.industry,
              created_at: '' // We set an empty date, as it's not needed here
            }));
            setCustomers(formattedCustomers);
          } else {
            setCustomers([]);
          }
        }
        // Falls die Rolle nicht bekannt ist
        if (user.role !== 'admin' && user.role !== 'agent' && user.role !== 'customer' && user.role !== 'supervisor') {
          console.warn(`useCustomers: Unknown user role: ${user.role}`);
          setCustomers([]);
        }
      } catch (error: any) {
        console.error('Unexpected error in useCustomers:', error);
        toast({
          variant: "destructive",
          title: "Unerwarteter Fehler",
          description: error.message || "Beim Laden der Kunden ist ein Fehler aufgetreten.",
        });
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [user, toast]);

  return { customers, isLoading };
};
