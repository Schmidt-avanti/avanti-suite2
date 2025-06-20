import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card';
import { Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Invoice = {
  id: string;
  created_at: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  customer_id: string;
  description: string | null;
};

const CustomerInvoices = () => {
  const { user } = useAuth();

  // Fetch all invoices available for this customer
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['customer-invoices', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Benutzer nicht authentifiziert');

      // First get the customer ID for the user
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_customer_assignments')
        .select('customer_id')
        .eq('user_id', user.id);

      if (assignmentsError) {
        console.error('Error fetching user assignments:', assignmentsError);
        throw assignmentsError;
      }

      if (!assignments || assignments.length === 0) {
        console.warn('User has no customer assignments');
        return [];
      }

      const customerIds = assignments.map(a => a.customer_id);
      
      // For now, we'll return mock data since the actual invoices table may not exist yet
      // In the future, this would be replaced with a real query to the invoices table
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          created_at: new Date().toISOString(),
          invoice_number: 'INV-2023-001',
          amount: 1250.00,
          status: 'pending',
          due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
          customer_id: customerIds[0],
          description: 'Monatsabrechnung Mai 2023'
        },
        {
          id: '2',
          created_at: new Date(Date.now() - 30*24*60*60*1000).toISOString(),
          invoice_number: 'INV-2023-002',
          amount: 980.50,
          status: 'paid',
          due_date: new Date(Date.now() - 15*24*60*60*1000).toISOString(),
          customer_id: customerIds[0],
          description: 'Monatsabrechnung Juni 2023'
        }
      ];

      return mockInvoices;
    },
    enabled: !!user?.id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd. MMMM yyyy', { locale: de });
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-green-600 bg-green-100 border-green-600';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 border-yellow-600';
      case 'overdue':
        return 'text-red-600 bg-red-100 border-red-600';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'Bezahlt';
      case 'pending':
        return 'Ausstehend';
      case 'overdue':
        return 'Überfällig';
      default:
        return status;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Rechnungen</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : invoices && invoices.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Ihre Rechnungen</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rechnungsnummer</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Fälligkeitsdatum</TableHead>
                  <TableHead>Betrag</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.description || '-'}</TableCell>
                    <TableCell>{formatDate(invoice.created_at)}</TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusClass(invoice.status)}`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <FileText className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Keine Rechnungen gefunden</p>
            <p className="text-sm text-muted-foreground">
              Für Ihren Kunden sind derzeit keine Rechnungen vorhanden.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerInvoices;
