import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import EndkundenList from '@/components/admin/EndkundenList'; // Assuming EndkundenList is moved to components
import EndkundenImport from '@/components/admin/EndkundenImport';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];

const EndkundenAdminPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching customers:', error.message);
        setCustomers([]);
      } else if (data) {
        setCustomers(data);
      }
    };

    fetchCustomers();
  }, []);

  const handleImportSuccess = () => {
    setIsImportModalOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filter & Aktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end space-x-4">
            <div className="flex-1 max-w-xs">
              <label htmlFor="customer-select" className="block text-sm font-medium text-gray-700 mb-1">Kunde auswählen</label>
              <Select onValueChange={(value) => setSelectedCustomerId(value === 'all' ? null : value)}>
                <SelectTrigger id="customer-select">
                  <SelectValue placeholder="Alle Kunden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kunden</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => setIsImportModalOpen(true)} disabled={!selectedCustomerId}>
                Daten importieren
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Endkunden importieren</DialogTitle>
          </DialogHeader>
          <EndkundenImport 
            customerId={selectedCustomerId} 
            onClose={() => setIsImportModalOpen(false)}
            onImportSuccess={handleImportSuccess}
          />
        </DialogContent>
      </Dialog>

      <EndkundenList key={selectedCustomerId || 'all'} customerId={selectedCustomerId} refreshTrigger={refreshTrigger} />
    </div>
  );
};

export default EndkundenAdminPage;