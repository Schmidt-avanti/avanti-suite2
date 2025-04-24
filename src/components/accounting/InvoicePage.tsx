import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomers } from '@/hooks/useCustomers';
import { DatePicker } from './DatePicker';
import { InvoiceTable } from './InvoiceTable';
import { InvoiceSummary } from './InvoiceSummary';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { exportInvoiceToExcel } from '@/utils/excelExport';
import { format } from 'date-fns';

const InvoicePage = () => {
  const { customers, isLoading } = useCustomers();
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });

  const handleExport = async () => {
    if (!selectedCustomer || !dateRange.from || !dateRange.to) return;
    
    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    const { data: invoiceData } = useInvoiceData(selectedCustomer, dateRange.from, dateRange.to);
    const { data: calculations } = useInvoiceCalculation(selectedCustomer, dateRange.from, dateRange.to);
    
    if (!invoiceData || !calculations) return;

    const exportData = {
      customerName: customer.name,
      costCenter: customer.cost_center || '',
      dateRange: `${format(dateRange.from, 'dd.MM.yyyy')} - ${format(dateRange.to, 'dd.MM.yyyy')}`,
      contactPerson: customer.contact_person || '',
      billingAddress: customer.billing_address || '',
      dailyRecords: invoiceData,
      summary: calculations
    };

    exportInvoiceToExcel(exportData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📄 Rechnungserstellung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Kunde</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Kunden auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {customers
                    .filter(customer => customer.isActive)
                    .map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Von</label>
              <DatePicker date={dateRange.from} onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))} />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Bis</label>
              <DatePicker date={dateRange.to} onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))} />
            </div>
          </div>

          {selectedCustomer && dateRange.from && dateRange.to && (
            <>
              <InvoiceTable customerId={selectedCustomer} from={dateRange.from} to={dateRange.to} />
              <div className="mt-6 flex justify-between items-start">
                <InvoiceSummary customerId={selectedCustomer} from={dateRange.from} to={dateRange.to} />
                <Button onClick={handleExport} className="ml-4">
                  <Download className="mr-2 h-4 w-4" />
                  Rechnung als Excel herunterladen
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicePage;
