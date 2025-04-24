
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
import { useInvoiceData } from '@/hooks/useInvoiceData';
import { useInvoiceCalculation } from '@/hooks/useInvoiceCalculation';
import { toast } from 'sonner';

const InvoicePage = () => {
  const { customers, isLoading: customersLoading } = useCustomers();
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Erster Tag des aktuellen Monats
    to: new Date()
  });

  // Daten für die Rechnung holen, aber nur wenn ein Kunde ausgewählt ist und beide Datumswerte gesetzt sind
  const { data: invoiceData, isLoading: isInvoiceDataLoading } = useInvoiceData(
    selectedCustomer, 
    dateRange.from as Date, 
    dateRange.to as Date
  );

  // Berechnungen für die Rechnung
  const { data: calculations, isLoading: isCalculationsLoading } = useInvoiceCalculation(
    selectedCustomer, 
    dateRange.from as Date, 
    dateRange.to as Date
  );

  const handleExport = () => {
    if (!selectedCustomer || !dateRange.from || !dateRange.to) {
      toast.error("Bitte wählen Sie einen Kunden und einen Datumsbereich aus.");
      return;
    }
    
    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) {
      toast.error("Kunde konnte nicht gefunden werden.");
      return;
    }

    if (!invoiceData || !calculations) {
      toast.error("Die Rechnungsdaten konnten nicht geladen werden.");
      return;
    }

    try {
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
      toast.success("Rechnung wurde erfolgreich exportiert.");
    } catch (error) {
      console.error("Fehler beim Exportieren der Rechnung:", error);
      toast.error("Beim Exportieren der Rechnung ist ein Fehler aufgetreten.");
    }
  };

  const isLoading = customersLoading || isInvoiceDataLoading || isCalculationsLoading;

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

          {isLoading && (
            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
              <p className="mt-2 text-muted-foreground">Lade Rechnungsdaten...</p>
            </div>
          )}

          {!isLoading && selectedCustomer && dateRange.from && dateRange.to && (
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
