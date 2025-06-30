import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/database.types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AnsprechpartnerList from '@/components/admin/AnsprechpartnerList';

type Customer = Database['public']['Tables']['customers']['Row'];

const AnsprechpartnerPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });
      if (error) {
        console.error('Error fetching customers:', error);
      } else {
        setCustomers(data);
        if (data.length > 0) {
          setSelectedCustomerId(data[0].id);
        }
      }
    };
    fetchCustomers();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ansprechpartner verwalten</h1>
        {customers.length > 0 && (
          <div className="w-64">
            <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Kunde auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {selectedCustomerId ? (
        <AnsprechpartnerList customerId={selectedCustomerId} />
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Bitte wählen Sie einen Kunden aus, um die Ansprechpartner zu verwalten.</p>
        </div>
      )}
    </div>
  );
};

export default AnsprechpartnerPage;
