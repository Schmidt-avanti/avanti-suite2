
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
        console.log(`Fetching customers for user role: ${user?.role}, ID: ${user?.id}`);
        
        let query = supabase.from('customers').select('id, name, branch, is_active');

        // Für Agenten nur die zugewiesenen Kunden abrufen
        if (user?.role === 'agent') {
          const { data: assignedCustomers, error: assignmentError } = await supabase
            .from('user_customer_assignments')
            .select('customer_id, customers(id, name, branch, is_active)')
            .eq('user_id', user.id);
            
          console.log('Agent assignments query:', {
            data: assignedCustomers?.length || 0,
            error: assignmentError?.message || 'none'
          });

          if (assignedCustomers && assignedCustomers.length > 0) {
            const mappedCustomers = assignedCustomers
              .filter(ac => ac.customers)
              .map(ac => ({
                id: ac.customers.id,
                name: ac.customers.name,
                branch: ac.customers.branch,
                is_active: ac.customers.is_active,
                created_at: '' // Wir setzen ein leeres Datum, da es hier nicht gebraucht wird
              }));
            setCustomers(mappedCustomers);
            setIsLoading(false);
            return;
          } else {
            console.log('No assigned customers found for agent, will return empty list');
          }
        } else if (user?.role === 'client') {
          // Für Kunden nur ihren eigenen Kunden abrufen
          const { data: userAssignment, error: assignmentError } = await supabase
            .from('user_customer_assignments')
            .select('customer_id, customers(id, name, branch, is_active)')
            .eq('user_id', user.id)
            .single();
            
          console.log('Client assignment query:', {
            data: userAssignment ? 'found' : 'not found',
            error: assignmentError?.message || 'none'
          });

          if (userAssignment && userAssignment.customers) {
            setCustomers([{
              id: userAssignment.customers.id,
              name: userAssignment.customers.name,
              branch: userAssignment.customers.branch,
              is_active: userAssignment.customers.is_active,
              created_at: '' // Wir setzen ein leeres Datum, da es hier nicht gebraucht wird
            }]);
            setIsLoading(false);
            return;
          }
        }

        // Für Admins oder wenn keine zugewiesenen Kunden gefunden wurden
        if (user?.role === 'admin') {
          console.log('Fetching all customers for admin');
          const { data, error } = await query;
          console.log('Admin customers query:', {
            data: data?.length || 0,
            error: error?.message || 'none'
          });
          
          if (data) {
            const formattedCustomers = data.map(customer => ({
              id: customer.id,
              name: customer.name,
              branch: customer.branch,
              is_active: customer.is_active,
              created_at: '' // Wir setzen ein leeres Datum, da es hier nicht gebraucht wird
            }));
            setCustomers(formattedCustomers);
          }
        } else {
          console.log(`User with role ${user?.role} has no customer access method defined`);
          setCustomers([]);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [user]);

  return { customers, isLoading };
};
