
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Customer } from '@/types';

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        
        if (!user) {
          console.log('No authenticated user found, skipping customer fetch');
          setCustomers([]);
          setIsLoading(false);
          return;
        }
        
        console.log('Fetching customers for user with role:', user.role);
        
        // Für Agenten nur die zugewiesenen Kunden abrufen
        if (user?.role === 'agent') {
          console.log('Fetching assigned customers for agent:', user.id);
          
          const { data: assignedCustomers, error: assignmentError } = await supabase
            .from('user_customer_assignments')
            .select('customer_id, customers(id, name, branch, is_active)')
            .eq('user_id', user.id);

          if (assignmentError) {
            console.error('Error fetching agent customer assignments:', assignmentError);
            setCustomers([]);
            setIsLoading(false);
            return;
          }

          console.log('Agent assigned customers raw data:', assignedCustomers);

          if (assignedCustomers && assignedCustomers.length > 0) {
            const mappedCustomers = assignedCustomers
              .filter(ac => ac.customers) // Filter out any null customer references
              .map(ac => ({
                id: ac.customers.id,
                name: ac.customers.name,
                branch: ac.customers.branch,
                is_active: ac.customers.is_active,
                created_at: '' // Wir setzen ein leeres Datum, da es hier nicht gebraucht wird
              }));
            
            console.log('Mapped customers for agent:', mappedCustomers);
            setCustomers(mappedCustomers);
          } else {
            console.warn('No customers assigned to agent:', user.id);
            setCustomers([]);
          }
          
          setIsLoading(false);
          return;
        } else if (user?.role === 'client') {
          // Für Kunden nur ihren eigenen Kunden abrufen
          console.log('Fetching assigned customer for client:', user.id);
          
          const { data: userAssignment, error: clientAssignmentError } = await supabase
            .from('user_customer_assignments')
            .select('customer_id, customers(id, name, branch, is_active)')
            .eq('user_id', user.id)
            .single();

          if (clientAssignmentError) {
            console.error('Error fetching client customer assignment:', clientAssignmentError);
            setCustomers([]);
            setIsLoading(false);
            return;
          }

          if (userAssignment && userAssignment.customers) {
            console.log('Client assigned customer:', userAssignment.customers);
            
            setCustomers([{
              id: userAssignment.customers.id,
              name: userAssignment.customers.name,
              branch: userAssignment.customers.branch,
              is_active: userAssignment.customers.is_active,
              created_at: '' // Wir setzen ein leeres Datum, da es hier nicht gebraucht wird
            }]);
          } else {
            console.warn('No customer assigned to client:', user.id);
            setCustomers([]);
          }
          
          setIsLoading(false);
          return;
        }

        // Für Admins oder wenn keine zugewiesenen Kunden gefunden wurden
        if (user?.role === 'admin') {
          console.log('Fetching all customers for admin user');
          
          const { data, error } = await supabase
            .from('customers')
            .select('id, name, branch, is_active');
          
          if (error) {
            console.error('Error fetching all customers:', error);
            setCustomers([]);
          } else if (data) {
            const formattedCustomers = data.map(customer => ({
              id: customer.id,
              name: customer.name,
              branch: customer.branch,
              is_active: customer.is_active,
              created_at: '' // Wir setzen ein leeres Datum, da es hier nicht gebraucht wird
            }));
            
            console.log('Found customers for admin:', formattedCustomers.length);
            setCustomers(formattedCustomers);
          }
        }
      } catch (error) {
        console.error('Error in useCustomers hook:', error);
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [user]);

  return { customers, isLoading };
};
