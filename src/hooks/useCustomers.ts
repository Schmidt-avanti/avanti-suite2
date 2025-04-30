
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
        let query = supabase.from('customers').select('id, name, branch, is_active');

        // Für Agenten nur die zugewiesenen Kunden abrufen
        if (user?.role === 'agent') {
          const { data: assignedCustomers } = await supabase
            .from('user_customer_assignments')
            .select('customer_id, customers(id, name, branch, is_active)')
            .eq('user_id', user.id);

          if (assignedCustomers && assignedCustomers.length > 0) {
            const mappedCustomers = assignedCustomers
              .filter(ac => ac.customers)
              .map(ac => ({
                id: ac.customers.id,
                name: ac.customers.name,
                branch: ac.customers.branch,
                isActive: ac.customers.is_active,
                createdAt: '' // Wir setzen ein leeres Datum, da es hier nicht gebraucht wird
              }));
            setCustomers(mappedCustomers);
            setIsLoading(false);
            return;
          }
        } else if (user?.role === 'client') {
          // Für Kunden nur ihren eigenen Kunden abrufen
          const { data: userAssignment } = await supabase
            .from('user_customer_assignments')
            .select('customer_id, customers(id, name, branch, is_active)')
            .eq('user_id', user.id)
            .single();

          if (userAssignment && userAssignment.customers) {
            setCustomers([{
              id: userAssignment.customers.id,
              name: userAssignment.customers.name,
              branch: userAssignment.customers.branch,
              isActive: userAssignment.customers.is_active,
              createdAt: '' // Wir setzen ein leeres Datum, da es hier nicht gebraucht wird
            }]);
            setIsLoading(false);
            return;
          }
        }

        // Für Admins oder wenn keine zugewiesenen Kunden gefunden wurden
        if (user?.role === 'admin') {
          const { data } = await query;
          if (data) {
            const formattedCustomers = data.map(customer => ({
              id: customer.id,
              name: customer.name,
              branch: customer.branch,
              isActive: customer.is_active,
              createdAt: '' // Wir setzen ein leeres Datum, da es hier nicht gebraucht wird
            }));
            setCustomers(formattedCustomers);
          }
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
